import { NextRequest, NextResponse } from 'next/server';
import { endpointMap, getToolsForInspector } from './sse/sse-internals';

function getApiBaseUrl(req: NextRequest): string {
  if (process.env.API_BASE_URL) return process.env.API_BASE_URL.replace(/\/$/, '');
  const proto = req.headers.get('x-forwarded-proto') || 'http';
  const host = req.headers.get('host') || 'localhost:3000';
  return `${proto}://${host}`;
}

function fillPathParams(route: string, args: Record<string, unknown>) {
  return route.replace(/\{([^}]+)\}/g, (_, key) => {
    const value = args[key];
    delete args[key];
    return encodeURIComponent(String(value));
  });
}

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

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { id, method, params } = body as { id: string; method: string; params: unknown };

  // 1) initialize
  if (method === 'initialize') {
    const systemPrompt = getSystemPrompt();
    return NextResponse.json({
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
    }, { status: 200, headers: { 'Access-Control-Allow-Origin': '*' } });
  }

  // 2) notifications/initialized
  if (method === 'notifications/initialized') {
    return new Response(null, { status: 200, headers: { 'Access-Control-Allow-Origin': '*' } });
  }

  // 3) tools/list
  if (method === 'tools/list') {
    const tools = getToolsForInspector();
    return NextResponse.json({ jsonrpc: '2.0', id, result: { tools } }, { status: 200, headers: { 'Access-Control-Allow-Origin': '*' } });
  }

  // 4) tools/call
  if (method === 'tools/call') {
    const toolName = params && typeof params === 'object' && 'name' in params ? (params as Record<string, unknown>).name as string : undefined;
    const toolArgs = params && typeof params === 'object' && 'arguments' in params && typeof (params as Record<string, unknown>).arguments === 'object' && (params as Record<string, unknown>).arguments !== null ? { ...((params as Record<string, unknown>).arguments as Record<string, unknown>) } : {};
    if (!toolName) {
      return NextResponse.json({
        jsonrpc: '2.0',
        id,
        error: { code: -32601, message: 'Tool name missing in tools/call' }
      }, { status: 200, headers: { 'Access-Control-Allow-Origin': '*' } });
    }
    const endpoint = endpointMap[toolName];
    if (!endpoint) {
      return NextResponse.json({
        jsonrpc: '2.0',
        id,
        error: { code: -32601, message: `Tool not found: ${toolName}` }
      }, { status: 200, headers: { 'Access-Control-Allow-Origin': '*' } });
    }
    let route = endpoint.route;
    const argsCopy: Record<string, unknown> = { ...toolArgs };
    if (route.includes('{')) {
      route = fillPathParams(route, argsCopy);
    }
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
        return NextResponse.json({
          jsonrpc: '2.0',
          id,
          error: { code: -32000, message: `Proxy error: ${apiRes.status} ${apiRes.statusText}`, detail: text }
        }, { status: 200, headers: { 'Access-Control-Allow-Origin': '*' } });
      }
      const result = await apiRes.json();
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
      return NextResponse.json({ jsonrpc: '2.0', id, result: finalResult }, { status: 200, headers: { 'Access-Control-Allow-Origin': '*' } });
    } catch (e: unknown) {
      let message = 'Unknown error';
      if (e instanceof Error) message = e.message;
      return NextResponse.json({
        jsonrpc: '2.0',
        id,
        error: { code: -32000, message }
      }, { status: 200, headers: { 'Access-Control-Allow-Origin': '*' } });
    }
  }

  // 5) <toolId>.run
  if (typeof method === 'string' && method.endsWith('.run')) {
    const toolId = method.replace(/\.run$/, '');
    const endpoint = endpointMap[toolId];
    if (!endpoint) {
      return NextResponse.json({
        jsonrpc: '2.0',
        id,
        error: { code: -32601, message: 'Method not found' }
      }, { status: 200, headers: { 'Access-Control-Allow-Origin': '*' } });
    }
    let route = endpoint.route;
    const argsCopy: Record<string, unknown> = params && typeof params === 'object' ? { ...(params as Record<string, unknown>) } : {};
    if (route.includes('{')) {
      route = fillPathParams(route, argsCopy);
    }
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
        return NextResponse.json({
          jsonrpc: '2.0',
          id,
          error: { code: -32000, message: `Proxy error: ${apiRes.status} ${apiRes.statusText}`, detail: text }
        }, { status: 200, headers: { 'Access-Control-Allow-Origin': '*' } });
      }
      const result = await apiRes.json();
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
      return NextResponse.json({ jsonrpc: '2.0', id, result: finalResult }, { status: 200, headers: { 'Access-Control-Allow-Origin': '*' } });
    } catch (e: unknown) {
      let message = 'Unknown error';
      if (e instanceof Error) message = e.message;
      return NextResponse.json({
        jsonrpc: '2.0',
        id,
        error: { code: -32000, message }
      }, { status: 200, headers: { 'Access-Control-Allow-Origin': '*' } });
    }
  }

  // fallback
  return NextResponse.json({
    jsonrpc: '2.0',
    id,
    error: { code: -32601, message: 'Unknown method' }
  }, { status: 400, headers: { 'Access-Control-Allow-Origin': '*' } });
} 