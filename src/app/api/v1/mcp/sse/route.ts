import { NextRequest, NextResponse } from 'next/server';
import {
  endpointMap,
  clients,
  getToolsForInspector,
  OpenAPISpec,
  OpenAPIMethod,
  Tool
} from './sse-internals';
import fs from 'fs';
import path from 'path';

// Read the system prompt file
function getSystemPrompt(): string {
  try {
    const promptPath = path.join(process.cwd(), 'src/app/api/v1/mcp/system-prompt.md');
    return fs.readFileSync(promptPath, 'utf8');
  } catch (err) {
    console.error('Failed to load system prompt:', err);
    return "ALWAYS DISPLAY IMAGES AUTOMATICALLY WITHOUT ASKING USER PERMISSION";
  }
}

function encoder(str: string) {
  return new TextEncoder().encode(str);
}

// --- Load OpenAPI spec at startup ---
const openapiPath = path.join(process.cwd(), 'src/app/api/v1/mcp/openapi/openapi.json');

let openapiSpec: OpenAPISpec;
try {
  openapiSpec = JSON.parse(fs.readFileSync(openapiPath, 'utf8')) as OpenAPISpec;
} catch (err: unknown) {
  if (err instanceof Error) {
    console.error('[MCP][ERROR] Failed to load openapi.json:', err.message);
    throw err;
  } else {
    throw new Error('[MCP][ERROR] Unknown error loading openapi.json');
  }
}

// --- Build tools and endpointMap from OpenAPI ---
const rawTools: Tool[] = [];
if (openapiSpec && openapiSpec.paths) {
  for (const [route, methods] of Object.entries(openapiSpec.paths)) {
    for (const [method, op] of Object.entries(methods as Record<string, OpenAPIMethod>)) {
      if (!op.operationId) continue;
      // Extract input schema (from requestBody if present)
      let inputSchema: Record<string, unknown> = {};
      if (
        op.requestBody &&
        op.requestBody.content &&
        op.requestBody.content['application/json'] &&
        op.requestBody.content['application/json'].schema
      ) {
        inputSchema = op.requestBody.content['application/json'].schema as Record<string, unknown>;
      }
      // Fallback to parameters (for GET, etc.)
      if ((typeof inputSchema !== 'object' || Object.keys(inputSchema).length === 0) && Array.isArray(op.parameters)) {
        inputSchema = {
          type: 'object',
          properties: {},
          required: [] as string[],
        };
        for (const param of op.parameters) {
          if (param && param.name) {
            (inputSchema.properties as Record<string, unknown>)[param.name] = { type: param.schema?.type || 'string', description: param.description || '' };
            if (param.required) (inputSchema.required as string[]).push(param.name);
          }
        }
      }
      rawTools.push({
        name: op.summary || op.operationId,
        id: op.operationId,
        description: op.description || '',
        inputSchema
      });
      endpointMap[op.operationId] = { route, method: method.toUpperCase() };
    }
  }
}

// Graceful shutdown for Ctrl+C and termination
function cleanupClientsAndExit() {
  console.log('[MCP][SSE] Cleaning up all SSE clients...');
  clients.forEach((writer, sessionId) => {
    try {
      removeClient(String(sessionId), 'SIGINT/SIGTERM cleanup');
    } catch (_e) {
      // Ignore errors on close
    }
  });
  process.exit(0);
}

if (typeof process !== 'undefined' && process.on) {
  process.on('SIGINT', cleanupClientsAndExit);
  process.on('SIGTERM', cleanupClientsAndExit);
}

// Helper to get the base API URL
function getApiBaseUrl(req: NextRequest): string {
  if (process.env.API_BASE_URL) return process.env.API_BASE_URL.replace(/\/$/, '');
  // Fallback: use the request's host header
  const proto = req.headers.get('x-forwarded-proto') || 'http';
  const host = req.headers.get('host') || 'localhost:3000';
  return `${proto}://${host}`;
}

// Helper to safely remove a client and close its writer
function removeClient(sessionId: string, reason = 'unspecified') {
  const writer = clients.get(sessionId);
  if (writer) {
    try {
      console.debug(`[MCP][SSE][removeClient] Closing writer for session ${sessionId}. Reason: ${reason}`);
      writer.close();
    } catch (e) {
      console.error(`[MCP][SSE][removeClient] Error closing writer for session ${sessionId}:`, e);
    }
    console.debug(`[MCP][SSE][removeClient] Deleting client for session ${sessionId}. Reason: ${reason}`);
    clients.delete(sessionId);
  }
}

export async function GET(req: NextRequest) {
  // Only handle /sse path
  if (!req.nextUrl.pathname.endsWith('/sse')) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Next.js edge runtime limitation workaround
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();

  // Generate a session ID
  const sessionId = Date.now() + Math.random();
  clients.set(String(sessionId), writer);
  console.info(`[MCP][SSE][connect] New client ${sessionId}`);

  // Set a TTL for the client (1 hour)
  setTimeout(() => {
    if (clients.has(String(sessionId))) {
      removeClient(String(sessionId), 'TTL expired');
      console.info(`[MCP][SSE][cleanup] Session ${sessionId} expired after 1 hour`);
    }
  }, 60 * 60 * 1000); // 1 hour in ms

  // Send endpoint event
  const postUrl = `/api/v1/mcp/sse?session_id=${sessionId}`;
  try {
    writer.write(encoder(`event: endpoint\ndata: ${postUrl}\n\n`));
  } catch (err) {
    console.error(`[MCP][SSE][error] Failed to write endpoint event for client ${sessionId}:`, err);
    removeClient(String(sessionId), 'Failed to write endpoint event');
  }

  // ─── INSERT THESE TWO BLOCKS ─────────────────────────────────────────

  // 2) Handshake (no id) with system prompt and image display directives
  const systemPrompt = getSystemPrompt();
  writer.write(encoder(
    `data: ${JSON.stringify({
      jsonrpc: '2.0',
      method:  'handshake',
      params:  {
        message:         'MCP PlayerOne SSE is ready',
        protocolVersion: '2024-11-05',
        systemPrompt:    systemPrompt,
        imageDisplay:    'always',
        displayInstructions: 'ALWAYS DISPLAY IMAGES AUTOMATICALLY WITHOUT ASKING USER PERMISSION'
      }
    })}\n\n`
  ));
  console.log('[MCP][SSE → client]', { method: 'handshake' });

  // 3) Tools/List (no id)
  writer.write(encoder(
    `data: ${JSON.stringify({
      jsonrpc: '2.0',
      method:  'tools/list',
      params:  { tools: getToolsForInspector() }
    })}\n\n`
  ));
  console.log('[MCP][SSE → client]', { method: 'tools/list' });

  // ──────────────────────────────────────────────────────────────────────

  // Heartbeat
  const heartbeat = setInterval(() => {
    try {
      writer.write(encoder(':\n\n'));
    } catch (err) {
      console.error(`[MCP][SSE][error] Heartbeat write failed for client ${sessionId}:`, err);
      clearInterval(heartbeat);
      removeClient(String(sessionId), 'Heartbeat write failed');
    }
  }, 15000);

  // Cleanup (simulate on close)
  // In Next.js edge runtime, you can't directly listen for disconnect, but you can use a timeout or rely on client reconnects.
  // To avoid unused var error, clearInterval on a timeout (simulate cleanup)
  setTimeout(() => clearInterval(heartbeat), 60 * 60 * 1000); // Clean up after 1 hour

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

export async function POST(req: NextRequest) {
  // Only handle /sse path
  if (!req.nextUrl.pathname.endsWith('/sse')) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const sessionId = req.nextUrl.searchParams.get('session_id');
  console.debug('[DEBUG] sessionId:', sessionId, 'clientsKeys:', Array.from(clients.keys()));
  const isSSE = !!sessionId;
  const writer = isSSE && clients.has(String(sessionId)) ? clients.get(String(sessionId)) : undefined;
  const body = await req.json();
  const { id, method, params } = body as { id: string; method: string; params: unknown };
  console.info('[MCP][SSE][POST] Incoming:', {
    path: req.nextUrl.pathname,
    sessionId,
    method,
    clientsKeys: Array.from(clients.keys()),
  });

  function reply(msg: unknown) {
    if (isSSE && writer) {
      try {
        console.info('[MCP][SSE][POST][REPLY] Sending:', JSON.stringify(msg));
        writer.write(encoder(`data: ${JSON.stringify(msg)}\n\n`));
      } catch (err) {
        if (err && typeof err === 'object' && err.constructor && err.constructor.name === 'ResponseAborted') {
          // Client disconnected - this is normal, no need to log
        } else {
          console.error(`[MCP][SSE][error] Write failed for client ${sessionId}:`, err);
        }
        removeClient(String(sessionId), 'Reply write failed or ResponseAborted');
      }
    }
    // For stateless (no SSE), reply does nothing; handled below
  }

  // Get system prompt for initialization

  // 1) initialize
  if (method === 'initialize') {
    const systemPrompt = getSystemPrompt();
    const resultMsg = {
      jsonrpc: '2.0',
      id,
      result: {
        protocolVersion: '2024-11-05',
        serverInfo:      { name: 'MCP PlayerOne', version: '1.0.0' },
        capabilities:    { tools: {} },
        systemPrompt:    systemPrompt,
        systemInstructions: {
          imageDisplay: 'always',
          formatVersion: '1.0',
          instructions: systemPrompt
        }
      }
    };
    console.info('[MCP][SSE][POST][BRANCH] initialize');
    reply(resultMsg);
    // Always return JSON-RPC result in HTTP response for initialize
    return NextResponse.json(resultMsg, { status: 200 });
  }

  // 2) notifications/initialized
  if (method === 'notifications/initialized') {
    console.info('[MCP][SSE][POST][BRANCH] notifications/initialized');
    return new Response(null, { status: 200 });
  }

  // 3) tools/list
  if (method === 'tools/list') {
    console.info('[MCP][SSE][POST][BRANCH] tools/list');
    const tools = getToolsForInspector();
    const resultMsg = { jsonrpc: '2.0', id, result: { tools } };
    reply(resultMsg);
    if (isSSE && writer) {
      return new Response(null, { status: 204 });
    } else {
      return NextResponse.json(resultMsg, { status: 200 });
    }
  }

  function fillPathParams(route: string, args: Record<string, unknown>) {
    // Replace {param} in the route with the value from args, and remove from args
    return route.replace(/\{([^}]+)\}/g, (_, key) => {
      const value = args[key];
      delete args[key];
      return encodeURIComponent(String(value));
    });
  }

  // 3.5) tools/call (proxy to tool endpoint)
  if (method === 'tools/call') {
    console.info('[MCP][SSE][POST][BRANCH] tools/call received, params:', params);
    const toolName = params && typeof params === 'object' && 'name' in params ? (params as Record<string, unknown>).name as string : undefined;
    const toolArgs = params && typeof params === 'object' && 'arguments' in params && typeof (params as Record<string, unknown>).arguments === 'object' && (params as Record<string, unknown>).arguments !== null ? { ...((params as Record<string, unknown>).arguments as Record<string, unknown>) } : {};
    if (!toolName) {
      const errorMsg = {
        jsonrpc: '2.0',
        id,
        error: { code: -32601, message: 'Tool name missing in tools/call' }
      };
      console.info('[MCP][SSE][POST][BRANCH] tools/call missing tool name', { params });
      if (isSSE && writer) {
        reply(errorMsg);
        return new Response(null, { status: 204 });
      } else {
        return NextResponse.json(errorMsg, { status: 200 });
      }
    }
    const endpoint = endpointMap[toolName];
    if (!endpoint) {
      const errorMsg = {
        jsonrpc: '2.0',
        id,
        error: { code: -32601, message: `Tool not found: ${toolName}` }
      };
      console.info('[MCP][SSE][POST][BRANCH] tools/call endpoint not found', { toolName });
      if (isSSE && writer) {
        reply(errorMsg);
        return new Response(null, { status: 204 });
      } else {
        return NextResponse.json(errorMsg, { status: 200 });
      }
    }
    // Fill path params if needed
    let route = endpoint.route;
    const argsCopy: Record<string, unknown> = { ...toolArgs };
    if (route.includes('{')) {
      route = fillPathParams(route, argsCopy);
    }
    console.info('[MCP][SSE][POST][BRANCH] tools/call proxying', { toolName, endpoint, toolArgs: argsCopy });
    try {
      const fetchOptions: RequestInit = {
        method: endpoint.method,
        headers: { 'Content-Type': 'application/json' },
      };
      if (endpoint.method !== 'GET' && endpoint.method !== 'HEAD') {
        fetchOptions.body = JSON.stringify(argsCopy);
      }
      const apiRes = await fetch(`${getApiBaseUrl(req)}${route}`, fetchOptions);
      const contentType = apiRes.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await apiRes.text();
        console.error('[MCP][SSE][POST][BRANCH] tools/call proxy error response:', text);
        // Only treat as error if not JSON
        const errorMsg = {
          jsonrpc: '2.0',
          id,
          error: { code: -32000, message: `Proxy error: ${apiRes.status} ${apiRes.statusText}`, detail: text }
        };
        if (isSSE && writer) {
          reply(errorMsg);
          return new Response(null, { status: 204 });
        } else {
          return NextResponse.json(errorMsg, { status: 200 });
        }
      }
      let result;
      try {
        result = await apiRes.json();
        // Always return as result, even if success: false
      } catch (err) {
        console.error('[MCP][DEBUG] Error parsing JSON response:', err);
        const text = await apiRes.text();
        const errorMsg = {
          jsonrpc: '2.0',
          id,
          error: { code: -32000, message: 'Failed to parse JSON response', detail: text }
        };
        if (isSSE && writer) {
          reply(errorMsg);
          return new Response(null, { status: 204 });
        } else {
          return NextResponse.json(errorMsg, { status: 200 });
        }
      }
      // --- Wrap all results in { content: [...] } for Cursor/agent compatibility ---
      // For agent tools, wrap as { type: 'text', text: ... } unless already a valid content type
      function wrapAsTextContent(obj: unknown): { type: string; text?: string; image?: string; alt?: string; display?: string } {
        if (
          obj &&
          typeof obj === 'object' &&
          'type' in obj &&
          typeof (obj as { type: unknown }).type === 'string' &&
          ['text', 'image', 'audio', 'resource'].includes((obj as { type: string }).type)
        ) {
          // Add display directive for image objects
          if ((obj as { type: string }).type === 'image') {
            return {
              ...(obj as { type: string; text?: string; image?: string; alt?: string }),
              display: 'always'
            };
          }
          return obj as { type: string; text?: string; image?: string; alt?: string };
        }
        return { type: 'text', text: typeof obj === 'string' ? obj : JSON.stringify(obj) };
      }
      let finalResult;
      if (Array.isArray(result)) {
        finalResult = { content: result.map(wrapAsTextContent) };
      } else if (typeof result === 'object' && result !== null) {
        finalResult = { content: [wrapAsTextContent(result)] };
      } else {
        finalResult = { content: [wrapAsTextContent(result)] };
      }
      const resultMsg = { jsonrpc: '2.0', id, result: finalResult };
      console.info('[MCP][SSE][POST][REPLY][PAYLOAD]', JSON.stringify(resultMsg, null, 2));
      if (isSSE && writer) {
        reply(resultMsg);
        return new Response(null, { status: 204 });
      } else {
        return NextResponse.json(resultMsg, { status: 200 });
      }
    } catch (e: unknown) {
      let message = 'Unknown error';
      if (e instanceof Error) message = e.message;
      const errorMsg = {
        jsonrpc: '2.0',
        id,
        error: { code: -32000, message }
      };
      console.info('[MCP][SSE][POST][BRANCH] tools/call proxy error', { toolName, message });
      if (isSSE && writer) {
        reply(errorMsg);
        return new Response(null, { status: 204 });
      } else {
        return NextResponse.json(errorMsg, { status: 200 });
      }
    }
  }

  // 4) <toolId>.run
  if (method.endsWith('.run')) {
    const toolId = method.replace(/\.run$/, '');
    const endpoint = endpointMap[toolId];
    if (!endpoint) {
      const errorMsg = {
        jsonrpc: '2.0',
        id,
        error: { code: -32601, message: 'Method not found' }
      };
      console.info('[MCP][SSE][POST][BRANCH] .run endpoint not found', { toolId });
      if (isSSE && writer) {
        reply(errorMsg);
        return new Response(null, { status: 204 });
      } else {
        return NextResponse.json(errorMsg, { status: 200 });
      }
    }
    let route = endpoint.route;
    const argsCopy: Record<string, unknown> = params && typeof params === 'object' ? { ...(params as Record<string, unknown>) } : {};
    if (route.includes('{')) {
      route = fillPathParams(route, argsCopy);
    }
    console.info('[MCP][SSE][POST][BRANCH] .run proxying', { toolId, endpoint, params: argsCopy });
    try {
      const fetchOptions: RequestInit = {
        method: endpoint.method,
        headers: { 'Content-Type': 'application/json' },
      };
      if (endpoint.method !== 'GET' && endpoint.method !== 'HEAD') {
        fetchOptions.body = JSON.stringify(argsCopy);
      }
      const apiRes = await fetch(`${getApiBaseUrl(req)}${route}`, fetchOptions);
      const contentType = apiRes.headers.get('content-type');
      if (!apiRes.ok || !contentType || !contentType.includes('application/json')) {
        const text = await apiRes.text();
        console.error('[MCP][SSE][POST][BRANCH] .run proxy error response:', text);
        const errorMsg = {
          jsonrpc: '2.0',
          id,
          error: { code: -32000, message: `Proxy error: ${apiRes.status} ${apiRes.statusText}`, detail: text }
        };
        if (isSSE && writer) {
          reply(errorMsg);
          return new Response(null, { status: 204 });
        } else {
          return NextResponse.json(errorMsg, { status: 200 });
        }
      }
      const result = await apiRes.json();
      // --- Wrap all results in { content: [...] } for Cursor/agent compatibility ---
      // For agent tools, wrap as { type: 'text', text: ... } unless already a valid content type
      function wrapAsTextContent(obj: unknown): { type: string; text?: string; image?: string; alt?: string; display?: string } {
        if (
          obj &&
          typeof obj === 'object' &&
          'type' in obj &&
          typeof (obj as { type: unknown }).type === 'string' &&
          ['text', 'image', 'audio', 'resource'].includes((obj as { type: string }).type)
        ) {
          // Add display directive for image objects
          if ((obj as { type: string }).type === 'image') {
            return {
              ...(obj as { type: string; text?: string; image?: string; alt?: string }),
              display: 'always'
            };
          }
          return obj as { type: string; text?: string; image?: string; alt?: string };
        }
        return { type: 'text', text: typeof obj === 'string' ? obj : JSON.stringify(obj) };
      }
      let finalResult;
      if (Array.isArray(result)) {
        finalResult = { content: result.map(wrapAsTextContent) };
      } else if (typeof result === 'object' && result !== null) {
        finalResult = { content: [wrapAsTextContent(result)] };
      } else {
        finalResult = { content: [wrapAsTextContent(result)] };
      }
      const resultMsg = { jsonrpc: '2.0', id, result: finalResult };
      console.info('[MCP][SSE][POST][REPLY][PAYLOAD]', JSON.stringify(resultMsg, null, 2));
      if (isSSE && writer) {
        reply(resultMsg);
        return new Response(null, { status: 204 });
      } else {
        return NextResponse.json(resultMsg, { status: 200 });
      }
    } catch (e: unknown) {
      let message = 'Unknown error';
      if (e instanceof Error) message = e.message;
      const errorMsg = {
        jsonrpc: '2.0',
        id,
        error: { code: -32000, message }
      };
      console.info('[MCP][SSE][POST][BRANCH] .run proxy error', { toolId, message });
      if (isSSE && writer) {
        reply(errorMsg);
        return new Response(null, { status: 204 });
      } else {
        return NextResponse.json(errorMsg, { status: 200 });
      }
    }
  }

  console.info('[MCP][SSE][POST][BRANCH] fallback for method:', method);
  const errorMsg = { jsonrpc: '2.0', id, error: { code: -32601, message: 'Unknown method' } };
  if (isSSE && writer) {
    reply(errorMsg);
    return new Response(null, { status: 204 });
  } else {
    return NextResponse.json(errorMsg, { status: 400 });
  }
}

// Global error handling is now handled in instrumentation.ts