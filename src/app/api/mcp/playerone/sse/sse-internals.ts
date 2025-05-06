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

const rawTools: Tool[] = [];
export const endpointMap: Record<string, EndpointMapEntry> = {};
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