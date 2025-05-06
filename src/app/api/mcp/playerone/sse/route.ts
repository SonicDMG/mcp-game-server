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

function encoder(str: string) {
  return new TextEncoder().encode(str);
}

// --- Load OpenAPI spec at startup ---
const openapiPath = path.join(process.cwd(), 'src/app/api/mcp/playerone/openapi/openapi.json');

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
      writer.close();
    } catch (_e) {
      // Ignore errors on close
    }
    clients.delete(sessionId);
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
  console.log(`[MCP][SSE][connect] New client ${sessionId}`);

  // Send endpoint event
  const postUrl = `/api/mcp/playerone/sse?session_id=${sessionId}`;
  try {
    writer.write(encoder(`event: endpoint\ndata: ${postUrl}\n\n`));
  } catch (err) {
    console.error(`[MCP][SSE][error] Failed to write endpoint event for client ${sessionId}:`, err);
    clients.delete(String(sessionId));
  }

  // ─── INSERT THESE TWO BLOCKS ─────────────────────────────────────────

  // 2) Handshake (no id)
  writer.write(encoder(
    `data: ${JSON.stringify({
      jsonrpc: '2.0',
      method:  'handshake',
      params:  {
        message:         'MCP PlayerOne SSE is ready',
        protocolVersion: '2024-11-05'
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
      clients.delete(String(sessionId));
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
    },
  });
}

export async function POST(req: NextRequest) {
  // Only handle /sse path
  if (!req.nextUrl.pathname.endsWith('/sse')) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const sessionId = req.nextUrl.searchParams.get('session_id');
  if (!sessionId || !clients.has(String(sessionId))) {
    return NextResponse.json({ error: 'No SSE client for session' }, { status: 400 });
  }
  const writer = clients.get(String(sessionId));
  const body = await req.json();
  const { id, method, params } = body as { id: string; method: string; params: unknown };
  console.log('[MCP][SSE][POST] Incoming:', {
    path: req.nextUrl.pathname,
    sessionId,
    method,
    clientsKeys: Array.from(clients.keys()),
  });

  function reply(msg: unknown) {
    if (!writer) return;
    try {
      console.log('[MCP][SSE][POST][REPLY] Sending:', JSON.stringify(msg));
      writer.write(encoder(`data: ${JSON.stringify(msg)}\n\n`));
    } catch (err) {
      console.error(`[MCP][SSE][error] Write failed for client ${sessionId}:`, err);
      clients.delete(String(sessionId));
    }
  }

  // 1) initialize
  if (method === 'initialize') {
    const resultMsg = {
      jsonrpc: '2.0',
      id,
      result: {
        protocolVersion: '2024-11-05',
        serverInfo:      { name: 'MCP PlayerOne', version: '1.0.0' },
        capabilities:    { tools: {} }
      }
    };
    console.log('[MCP][SSE][POST][BRANCH] initialize');
    reply(resultMsg);
    return new Response(null, { status: 200 });
  }

  // 2) notifications/initialized
  if (method === 'notifications/initialized') {
    console.log('[MCP][SSE][POST][BRANCH] notifications/initialized');
    return new Response(null, { status: 200 });
  }

  // 3) tools/list
  if (method === 'tools/list') {
    console.log('[MCP][SSE][POST][BRANCH] tools/list');
    const tools = getToolsForInspector();
    const resultMsg = { jsonrpc: '2.0', id, result: { tools } };
    reply(resultMsg);
    return new Response(null, { status: 200 });
  }

  function fillPathParams(route: string, args: Record<string, unknown>) {
    // Replace {param} in the route with the value from args, and remove from args
    return route.replace(/\{([^}]+)\}/g, (_, key) => {
      const value = args[key];
      delete args[key];
      return encodeURIComponent(String(value));
    });
  }

  // Helper to get the correct array key for a tool's response from OpenAPI
  function getArrayKeyForTool(toolId: string): string {
    const endpoint = endpointMap[toolId];
    if (!endpoint) return 'content';
    const methods = openapiSpec.paths[endpoint.route];
    if (!methods) return 'content';
    const op = methods[endpoint.method.toLowerCase()];
    if (!op || !op.responses) return 'content';
    // Try to find the 200/201/2XX response
    const resp = op.responses['200'] || op.responses['201'] || Object.values(op.responses).find((r) => r && typeof r === 'object' && 'content' in r && r.content && (r.content as Record<string, unknown>)['application/json']);
    if (!resp || !resp.content || !(resp.content['application/json']) || !(resp.content['application/json'].schema)) return 'content';
    const schema = resp.content['application/json'].schema as Record<string, unknown>;
    if (schema.type === 'object' && schema.properties && typeof schema.properties === 'object') {
      for (const [key, prop] of Object.entries(schema.properties as Record<string, unknown>)) {
        if (typeof prop === 'object' && prop !== null && (prop as { type?: string }).type === 'array') return key;
      }
    }
    return 'content';
  }

  // 3.5) tools/call (proxy to tool endpoint)
  if (method === 'tools/call') {
    console.log('[MCP][SSE][POST][BRANCH] tools/call received, params:', params);
    const toolName = params && typeof params === 'object' && 'name' in params ? (params as Record<string, unknown>).name as string : undefined;
    const toolArgs = params && typeof params === 'object' && 'arguments' in params && typeof (params as Record<string, unknown>).arguments === 'object' && (params as Record<string, unknown>).arguments !== null ? { ...((params as Record<string, unknown>).arguments as Record<string, unknown>) } : {};
    if (!toolName) {
      const errorMsg = {
        jsonrpc: '2.0',
        id,
        error: { code: -32601, message: 'Tool name missing in tools/call' }
      };
      console.log('[MCP][SSE][POST][BRANCH] tools/call missing tool name', { params });
      reply(errorMsg);
      return new Response(null, { status: 200 });
    }
    const endpoint = endpointMap[toolName];
    if (!endpoint) {
      const errorMsg = {
        jsonrpc: '2.0',
        id,
        error: { code: -32601, message: `Tool not found: ${toolName}` }
      };
      console.log('[MCP][SSE][POST][BRANCH] tools/call endpoint not found', { toolName });
      reply(errorMsg);
      return new Response(null, { status: 200 });
    }
    // Fill path params if needed
    let route = endpoint.route;
    const argsCopy: Record<string, unknown> = { ...toolArgs };
    if (route.includes('{')) {
      route = fillPathParams(route, argsCopy);
    }
    console.log('[MCP][SSE][POST][BRANCH] tools/call proxying', { toolName, endpoint, toolArgs: argsCopy });
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
        console.error('[MCP][SSE][POST][BRANCH] tools/call proxy error response:', text);
        reply({
          jsonrpc: '2.0',
          id,
          error: { code: -32000, message: `Proxy error: ${apiRes.status} ${apiRes.statusText}`, detail: text }
        });
        return new Response(null, { status: 200 });
      }
      const result = await apiRes.json();
      // --- Wrap array result in object ---
      let finalResult = result;
      if (Array.isArray(result)) {
        // Special-case transformations for known tools
        if (toolName === 'listStories') {
          // Ensure every story record has startingLocation and only text content
          const fixedStories = result.map((story: Record<string, unknown>) => {
            // Remove or ignore any image content blocks
            let textContent: unknown[] = [];
            if (Array.isArray(story.content)) {
              textContent = story.content.filter((block: unknown) => typeof block === 'object' && block !== null && (block as { type?: string }).type === 'text');
            }
            return {
              ...story,
              startingLocation: story.startingLocation || '',
              content: textContent
            };
          });
          finalResult = { content: fixedStories };
        } else if (toolName === 'getLeaderboard') {
          finalResult = {
            content: result.map((entry: Record<string, unknown>, i: number) => ({
              type: 'text',
              text: `#${i + 1} ${entry.playerName || entry.userId || 'Player'}: ${entry.score || entry.totalArtifactsFound || 0} pts`
            }))
          };
        } else {
          // Use the correct key from OpenAPI, fallback to 'content'
          const key = getArrayKeyForTool(toolName || '');
          finalResult = { [key]: result };
        }
      } else if (typeof result === 'object' && result !== null) {
        // Object result: transform for known tools
        if (toolName === 'getStoryById') {
          finalResult = {
            content: [
              {
                type: 'text',
                text: `${(result as Record<string, unknown>).title || ''}${(result as Record<string, unknown>).description ? ': ' + (result as Record<string, unknown>).description : ''}`
              }
            ]
          };
        } else if ([
          'deleteStory', 'createGame', 'getStoryCreationStatus', 'movePlayer', 'takeItem', 'examineTarget', 'lookAround', 'getGameState', 'startGame', 'solveChallenge', 'killPlayer', 'lootPlayer', 'helpPlayer'
        ].includes(toolName)) {
          // Use the most relevant message or summary
          const text = (result as Record<string, unknown>).message || (result as Record<string, unknown>).status || (result as Record<string, unknown>).description || (result as Record<string, unknown>).title || JSON.stringify(result);
          finalResult = {
            content: [
              {
                type: 'text',
                text: String(text)
              }
            ]
          };
        }
      }
      const resultMsg = { jsonrpc: '2.0', id, result: finalResult };
      console.log('[MCP][SSE][POST][REPLY][PAYLOAD]', JSON.stringify(resultMsg, null, 2));
      reply(resultMsg);
    } catch (e: unknown) {
      let message = 'Unknown error';
      if (e instanceof Error) message = e.message;
      const errorMsg = {
        jsonrpc: '2.0',
        id,
        error: { code: -32000, message }
      };
      console.log('[MCP][SSE][POST][BRANCH] tools/call proxy error', { toolName, message });
      reply(errorMsg);
    }
    return new Response(null, { status: 200 });
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
      console.log('[MCP][SSE][POST][BRANCH] .run endpoint not found', { toolId });
      reply(errorMsg);
      return new Response(null, { status: 200 });
    }
    let route = endpoint.route;
    const argsCopy: Record<string, unknown> = params && typeof params === 'object' ? { ...(params as Record<string, unknown>) } : {};
    if (route.includes('{')) {
      route = fillPathParams(route, argsCopy);
    }
    console.log('[MCP][SSE][POST][BRANCH] .run proxying', { toolId, endpoint, params: argsCopy });
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
        reply({
          jsonrpc: '2.0',
          id,
          error: { code: -32000, message: `Proxy error: ${apiRes.status} ${apiRes.statusText}`, detail: text }
        });
        return new Response(null, { status: 200 });
      }
      const result = await apiRes.json();
      // --- Wrap array result in object ---
      let finalResult = result;
      if (Array.isArray(result)) {
        const key = getArrayKeyForTool(toolId || '');
        finalResult = { [key]: result };
      }
      const resultMsg = { jsonrpc: '2.0', id, result: finalResult };
      reply(resultMsg);
    } catch (e: unknown) {
      let message = 'Unknown error';
      if (e instanceof Error) message = e.message;
      const errorMsg = {
        jsonrpc: '2.0',
        id,
        error: { code: -32000, message }
      };
      console.log('[MCP][SSE][POST][BRANCH] .run proxy error', { toolId, message });
      reply(errorMsg);
    }
    return new Response(null, { status: 200 });
  }

  console.log('[MCP][SSE][POST][BRANCH] fallback for method:', method);
  const errorMsg = { jsonrpc: '2.0', id, error: { code: -32601, message: 'Unknown method' } };
  reply(errorMsg);
  return new Response(null, { status: 400 });
}