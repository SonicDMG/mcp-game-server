import fs from 'fs';
import path from 'path';

// Define types for OpenAPI spec
export interface OpenAPISpec {
  paths: Record<string, Record<string, OpenAPIMethod>>;
}
export interface OpenAPIMethod {
  operationId?: string;
  summary?: string;
  description?: string;
  requestBody?: {
    content?: {
      'application/json'?: {
        schema?: Record<string, unknown>;
      };
    };
  };
  parameters?: Array<{
    name: string;
    required?: boolean;
    schema?: { type?: string };
    description?: string;
  }>;
  responses?: Record<string, {
    description?: string;
    content?: {
      'application/json'?: {
        schema?: Record<string, unknown>;
      };
    };
  }>;
}
export interface Tool {
  name: string;
  id: string;
  description: string;
  inputSchema: Record<string, unknown>;
}
export interface EndpointMapEntry {
  route: string;
  method: string;
}

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

const rawTools: Tool[] = [];
export const endpointMap: Record<string, EndpointMapEntry> = {};

// Helper to resolve local $ref in OpenAPI spec
function resolveRef(ref: string, spec: unknown): unknown {
  if (typeof ref !== 'string' || !ref.startsWith('#/')) throw new Error('Only local refs supported');
  const parts = ref.slice(2).split('/');
  let result: unknown = spec;
  for (const part of parts) {
    if (typeof result === 'object' && result !== null && part in result) {
      result = (result as Record<string, unknown>)[part];
    } else {
      throw new Error(`Could not resolve ref: ${ref}`);
    }
  }
  return result;
}

// Flattens an OpenAPI schema with allOf into a single object schema
function flattenAllOf(schema: unknown, spec: unknown): Record<string, unknown> | undefined {
  if (!schema || typeof schema !== 'object') return schema as Record<string, unknown>;
  if (!('allOf' in schema)) return schema as Record<string, unknown>;
  const allOfSchemas = (schema as { allOf: unknown[] }).allOf;
  const merged: { type: string; properties: Record<string, unknown>; required: string[] } = { type: 'object', properties: {}, required: [] };
  for (const sub of allOfSchemas) {
    let resolved = sub;
    if (typeof resolved === 'object' && resolved !== null && '$ref' in resolved) {
      resolved = resolveRef((resolved as { $ref: string }).$ref, spec);
    }
    const flat = flattenAllOf(resolved, spec);
    if (flat && typeof flat === 'object') {
      if ('properties' in flat && typeof flat.properties === 'object') {
        Object.assign(merged.properties, flat.properties);
      }
      if ('required' in flat && Array.isArray(flat.required)) {
        merged.required = Array.from(new Set([...(merged.required || []), ...flat.required]));
      }
    }
  }
  return merged;
}

if (openapiSpec && openapiSpec.paths) {
  for (const [route, methods] of Object.entries(openapiSpec.paths)) {
    for (const [method, op] of Object.entries(methods as Record<string, unknown>)) {
      // Type assertion to unknown before casting to expected type to avoid TS overlap errors
      const opUnknown = op as unknown;
      if (typeof opUnknown !== 'object' || opUnknown === null || !("operationId" in opUnknown)) continue;
      // Extract input schema (from requestBody if present)
      let inputSchema: Record<string, unknown> = {};
      if (
        (opUnknown as unknown as { requestBody?: unknown }).requestBody &&
        typeof (opUnknown as unknown as { requestBody: unknown }).requestBody === 'object' &&
        (opUnknown as unknown as { requestBody: { content?: unknown } }).requestBody.content &&
        typeof (opUnknown as unknown as { requestBody: { content: unknown } }).requestBody.content === 'object' &&
        (opUnknown as unknown as { requestBody: { content: { 'application/json'?: unknown } } }).requestBody.content['application/json'] &&
        typeof (opUnknown as unknown as { requestBody: { content: { 'application/json': unknown } } }).requestBody.content['application/json'] === 'object' &&
        (opUnknown as unknown as { requestBody: { content: { 'application/json': { schema?: unknown } } } }).requestBody.content['application/json'].schema
      ) {
        let schema = (opUnknown as unknown as { requestBody: { content: { 'application/json': { schema: unknown } } } }).requestBody.content['application/json'].schema;
        // If schema is a $ref, resolve it
        if (typeof schema === 'object' && schema !== null && '$ref' in schema) {
          schema = resolveRef((schema as { $ref: string }).$ref, openapiSpec);
        }
        inputSchema = flattenAllOf(schema, openapiSpec) as Record<string, unknown>;
      }
      // Fallback to parameters (for GET, etc.)
      if ((typeof inputSchema !== 'object' || Object.keys(inputSchema).length === 0) && Array.isArray((opUnknown as unknown as { parameters?: unknown[] }).parameters)) {
        inputSchema = {
          type: 'object',
          properties: {},
          required: [] as string[],
        };
        for (const param of (opUnknown as unknown as { parameters: unknown[] }).parameters) {
          if (param && typeof param === 'object' && 'name' in param) {
            (inputSchema.properties as Record<string, unknown>)[(param as { name: string }).name] = { type: (param as { schema?: { type?: string } }).schema?.type || 'string', description: (param as { description?: string }).description || '' };
            if ((param as { required?: boolean }).required) (inputSchema.required as string[]).push((param as { name: string }).name);
          }
        }
      }
      // Ensure inputSchema is always included for agent compatibility (especially for createGame and similar tools)
      rawTools.push({
        name: (opUnknown as unknown as { operationId: string }).operationId,
        id: (opUnknown as unknown as { operationId: string }).operationId,
        description: (opUnknown as unknown as { description?: string }).description || '',
        inputSchema // <-- This is intentionally passed through for agent compatibility
      });
      endpointMap[(opUnknown as unknown as { operationId: string }).operationId] = { route, method: method.toUpperCase() };
    }
  }
}

export function getToolsForInspector() {
  return rawTools.map(t => ({
    name:        t.name,
    id:          t.id,
    description: t.description,
    inputSchema:
      t.inputSchema && typeof t.inputSchema === 'object' && (t.inputSchema as { type?: string }).type
        ? t.inputSchema
        : { type: 'object', properties: {} }
  }));
}

export const clients = new Map<string, WritableStreamDefaultWriter<Uint8Array>>(); 