import fs from 'fs';
import path from 'path';
// Keep URLSearchParams, remove URL if not used directly
import { URLSearchParams } from 'url'; 
// Import LOW-LEVEL Server class and Stdio transport
import { Server } from '@modelcontextprotocol/sdk/server/index.js'; 
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
// Import the schemas for requests we need to handle
import { 
  CallToolRequestSchema, 
  ListToolsRequestSchema, 
  ListResourcesRequestSchema, 
  ListPromptsRequestSchema 
} from '@modelcontextprotocol/sdk/types.js';
// Import Zod for schema validation (optional but recommended by SDK docs)
// If not already installed: npm install zod
// const { z } = require('zod'); 

// Use __dirname replacement for ES Modules
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MANIFEST_PATH = path.join(__dirname, 'openapi.localdev.json');
const GAME_API_BASE_URL = 'http://localhost:3000'; // Removed /api/game to avoid double prefix

let openapiManifest = null;

// --- Global Error Handlers ---
process.on('uncaughtException', (err, origin) => {
  console.error(`[Tool Server] FATAL: Uncaught Exception at: ${origin}, error: ${err.stack || err}`);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[Tool Server] FATAL: Unhandled Rejection at:', promise, 'reason:', reason);
});
// --- End Global Error Handlers ---

// --- Helper Function to find API details by operationId ---
function findOperationDetails(operationId) {
  if (!openapiManifest || !openapiManifest.paths) {
    return null;
  }
  for (const path in openapiManifest.paths) {
    const pathItem = openapiManifest.paths[path];
    for (const method in pathItem) {
      if (pathItem[method].operationId === operationId) {
        return {
          path: path, // e.g., /move
          method: method.toUpperCase(), // e.g., POST
          details: pathItem[method] // Full operation definition
        };
      }
    }
  }
  return null; // Operation not found
}
// --- End Helper Function ---

// --- Load Manifest ---
try {
  openapiManifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
} catch (error) {
  console.error(`[Tool Server] Failed to load OpenAPI manifest: ${error.message}`);
  process.exit(1);
}

// --- SDK Execute Function --- 
async function executeGameApi(operationId, parameters) {
   const operationDetails = findOperationDetails(operationId);
   if (!operationDetails) {
      console.error(`[Tool Server] Operation ID not found: ${operationId}`); // Keep error
      throw { code: -32601, message: `Method not found: Operation ID '${operationId}' not found in manifest` };
   }

    const targetPath = operationDetails.path; // e.g., /stories/{storyId}
    const targetMethod = operationDetails.method; // e.g., DELETE
    let finalTargetPath = targetPath;

    // --- Handle Path Parameters --- 
    if (operationDetails.details.parameters) {
        operationDetails.details.parameters.forEach(param => {
            if (param.in === 'path' && parameters[param.name]) {
                // Replace placeholder like {storyId} with actual value
                finalTargetPath = finalTargetPath.replace(`{${param.name}}`, encodeURIComponent(parameters[param.name]));
            }
        });
    }
    // --- End Path Parameter Handling ---

    let targetUrl = GAME_API_BASE_URL + finalTargetPath; // Use the path with substitutions
    console.error('DEBUG: targetUrl =', targetUrl); // Debug log for verification
    let fetchOptions = {
        method: targetMethod,
        headers: {}, // Content-Type often not needed for DELETE/GET
    };

    if (targetMethod === 'GET') {
      const queryParams = new URLSearchParams();
      if (operationDetails.details.parameters) {
        operationDetails.details.parameters.forEach(param => {
          if (param.in === 'query' && parameters[param.name] !== undefined) {
            queryParams.append(param.name, parameters[param.name]);
          }
        });
      }
      if (queryParams.toString()) {
         targetUrl += `?${queryParams.toString()}`;
      }
      // No body for GET
    } else if (targetMethod === 'POST' || targetMethod === 'PUT' || targetMethod === 'PATCH') {
      // Assume body parameters are directly in 'parameters' object for simplicity
      fetchOptions.body = JSON.stringify(parameters);
      // Ensure Content-Type header for methods with bodies
      fetchOptions.headers = { ...fetchOptions.headers, 'Content-Type': 'application/json' };
    } else if (targetMethod === 'DELETE') {
       // Typically no body or query params for simple DELETE by ID
       // Path parameter was handled above
    } else {
       console.error(`[Tool Server] Unsupported HTTP method: ${targetMethod}`);
       throw { code: -32601, message: `Method not found: HTTP method '${targetMethod}' not implemented` };
    }

    try {
      const apiResponse = await fetch(targetUrl, fetchOptions);
      const contentType = apiResponse.headers.get("content-type");
      let responseBodyText; // Read body as text first
      let responseBodyJson = null; // Store potential JSON parse result
      let parseError = null;

      // Read the body ONCE as text
      try {
          responseBodyText = await apiResponse.text();
      } catch (readError) {
          console.error(`[Tool Server] Failed to read response body from ${targetUrl}:`, readError);
          throw { code: -32000, message: `Failed to read response body: ${readError.message}`, data: null };
      }
      
      // Try to parse as JSON if content type suggests it
      if (contentType && contentType.includes("application/json")) {
          try {
              responseBodyJson = JSON.parse(responseBodyText);
          } catch (jsonError) {
              console.error(`[Tool Server] Failed to parse JSON response despite Content-Type header:`, jsonError);
              parseError = jsonError; // Store error but continue, we might need the text body for errors
          }
      }

      if (!apiResponse.ok) {
          console.error(`[Tool Server] Game API Error Status: ${apiResponse.status} for ${operationId}`); // Keep error + context
          throw { code: -32000, message: `Game API Error: ${apiResponse.status}`, data: responseBodyJson ?? responseBodyText };
      }
      
      // Handle successful response
      if (responseBodyJson !== null) {
          // Successfully parsed JSON
          return responseBodyJson; // Return the parsed JSON result
      } else if (contentType && contentType.includes("application/json")) {
         // Content-Type was JSON but parsing failed
         console.error(`[Tool Server] Error: API claimed JSON but parsing failed. Status: ${apiResponse.status}. Body: ${responseBodyText.substring(0, 200)}...`);
         throw { code: -32000, message: "Received invalid JSON response from game API", data: parseError?.message ?? responseBodyText };
      } else {
          // Response was not JSON, return/handle as text if needed, or throw error
          console.error(`[Tool Server] Warning: Game API response was not JSON (Content-Type: ${contentType}). Status: ${apiResponse.status}. Body: ${responseBodyText.substring(0,100)}...`);
          // If non-JSON success is unexpected, throw error. Otherwise, return text.
          // Assuming JSON is always expected on success:
          throw { code: -32000, message: "Received non-JSON response from game API on success", data: responseBodyText };
      }
    } catch (fetchError) {
       console.error(`[Tool Server] Fetch/Processing Error for ${operationId}:`, fetchError); // Keep error + context
       if (fetchError.code) throw fetchError; 
       throw { code: -32000, message: 'Failed to communicate with or parse response from the game API', data: fetchError.message };
    }
}
// --- End Execute Function ---

// --- Main Function to Setup and Run SDK Server ---
async function main() {
  console.error('[Tool Server] Initializing MCP Low-Level SDK Server...');

  const server = new Server(
    { // Server Info
      name: "MCPlayerOne-Game",
      version: "1.0.0"
    },
    { // Server Capabilities
      capabilities: { 
        tools: {}, 
        resources: {}, // Declare capability even if list is empty
        prompts: {}    // Declare capability even if list is empty
      }
    }
  );

  // --- Handler for tools/execute ---
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    let responsePayload;
    try { 
      const operationId = request.params.name; 
      const parameters = request.params.arguments; 
      if (!operationId || !parameters) {
         throw { code: -32602, message: "Invalid params: Missing tool name (operationId) or arguments (parameters)" };
      }
      
      // Call the backend API (this might throw a formatted error)
      const result = await executeGameApi(operationId, parameters);
      
      // --- Format SUCCESS result ---
      let resultText;
      if (typeof result === 'object' && result !== null) {
          try {
              resultText = JSON.stringify(result, null, 2); 
          } catch (stringifyError) {
              console.error('[Tool Server] Error stringifying success result object:', stringifyError);
              resultText = '[Error: Could not serialize success result object]';
          }
      } else {
          resultText = String(result);
          console.warn(`[Tool Server] Success result is not an object (type: ${typeof result}). Formatting as text.`);
      }
      responsePayload = { content: [{ type: 'text', text: resultText }] };

    } catch (error) {
      // --- Format ERROR result ---
      console.error('[Tool Server] Formatting caught error as text block:', error);
      let errorText = '[Tool Server] Unknown error occurred.';
      try {
        if (typeof error === 'object' && error !== null && error.message) {
            // Include code and data if available
            errorText = `Error Code: ${error.code || 'N/A'}\nMessage: ${error.message}`;
            if (error.data) {
                errorText += `\nData: ${JSON.stringify(error.data)}`;
            }
        } else if (error instanceof Error) {
            errorText = `Error: ${error.message}`;
        } else {
            errorText = `Error: ${String(error)}`;
        }
      } catch (formatError) {
          console.error('[Tool Server] Error formatting the error object itself:', formatError);
          errorText = '[Tool Server] Critical error during error formatting.';
      }
      // Always return errors wrapped in the standard content structure as well
      responsePayload = { content: [{ type: 'text', text: errorText }] };
    }
    // Send the prepared payload (either success or error formatted as text content)
    return responsePayload;
  });

  // --- Handler for tools/list ---
  server.setRequestHandler(ListToolsRequestSchema, async () => {
      console.error('[Tool Server] Received listTools request via SDK handler');
      const toolsList = [];
      if (openapiManifest && openapiManifest.paths) {
          for (const path in openapiManifest.paths) {
              for (const method in openapiManifest.paths[path]) {
                   const op = openapiManifest.paths[path][method];
                   if (op.operationId) { 
                      let finalInputSchema = { 
                          type: 'object', 
                          description: `Input schema for ${op.operationId}.`, 
                          properties: {}, 
                          required: [] 
                      };
                      
                      let requestBodySchema = null;
                      if (method.toUpperCase() === 'POST' && op.requestBody?.content?.['application/json']?.schema) {
                         requestBodySchema = op.requestBody.content['application/json'].schema;
                      } // Add handling for PUT, PATCH if necessary
                      
                      // Process requestBody schema (could be $ref or inline)
                      let resolvedBodySchema = null;
                      if (requestBodySchema && requestBodySchema['$ref']) {
                           // Resolve $ref for body
                           const refPath = requestBodySchema['$ref'].split('/');
                           if (refPath.length === 4 && refPath[0] === '#' && refPath[1] === 'components' && refPath[2] === 'schemas') {
                               const schemaName = refPath[3];
                               resolvedBodySchema = openapiManifest.components?.schemas?.[schemaName];
                           } 
                      } else {
                          resolvedBodySchema = requestBodySchema; // Inline body schema
                      }

                      // Function to process and merge a single schema (inline or resolved $ref)
                      const processAndMergeSchema = (schemaToProcess) => {
                          if (!schemaToProcess || typeof schemaToProcess !== 'object') return;

                          // Merge properties
                          if (schemaToProcess.properties && typeof schemaToProcess.properties === 'object') {
                              Object.assign(finalInputSchema.properties, schemaToProcess.properties);
                          }
                          // Merge required fields (avoid duplicates)
                          if (schemaToProcess.required && Array.isArray(schemaToProcess.required)) {
                              schemaToProcess.required.forEach(req => {
                                  if (!finalInputSchema.required.includes(req)) {
                                      finalInputSchema.required.push(req);
                                  }
                              });
                          }
                           // Update description if the schema part has one (prefer more specific)
                           if (schemaToProcess.description && typeof schemaToProcess.description === 'string') {
                                finalInputSchema.description = schemaToProcess.description;
                           }
                      };

                      // Merge properties/required from body schema (handles allOf internally if present)
                      if (resolvedBodySchema) {
                           if (Array.isArray(resolvedBodySchema.allOf)) {
                               resolvedBodySchema.allOf.forEach(subSchema => {
                                   let schemaPartToProcess = subSchema;
                                   if (subSchema['$ref']) {
                                       const refPath = subSchema['$ref'].split('/');
                                       if (refPath.length === 4 && refPath[0] === '#' && refPath[1] === 'components' && refPath[2] === 'schemas') {
                                            schemaPartToProcess = openapiManifest.components?.schemas?.[refPath[3]] ?? null;
                                       }
                                   }
                                   processAndMergeSchema(schemaPartToProcess);
                               });
                           } else {
                               processAndMergeSchema(resolvedBodySchema);
                           }
                      }

                      // --- Process Path and Query Parameters --- 
                      if (Array.isArray(op.parameters)) {
                          console.error(`[Tool Server] Processing ${op.parameters.length} parameters for ${op.operationId}`);
                          op.parameters.forEach(param => {
                              if ((param.in === 'path' || param.in === 'query') && param.schema) {
                                  console.error(`[Tool Server] Adding ${param.in} parameter: ${param.name}`);
                                  finalInputSchema.properties[param.name] = {
                                      type: param.schema.type,
                                      description: param.description || 'No description'
                                      // Add other schema details like format, enum etc. if available
                                  };
                                  if (param.required) {
                                      if (!finalInputSchema.required.includes(param.name)) {
                                          finalInputSchema.required.push(param.name);
                                      }
                                  }
                              } else {
                                   console.error(`[Tool Server] Skipping parameter ${param.name} (in: ${param.in}, schema exists: ${!!param.schema})`);
                              }
                          });
                      }
                      // --- End Parameter Processing ---

                      // Use operation summary/description if schema description is generic/missing
                      if (!finalInputSchema.description || finalInputSchema.description.startsWith('Input schema for')) {
                           finalInputSchema.description = op.summary || op.description || `Input for ${op.operationId}`;
                      }

                      toolsList.push({
                          name: op.operationId,
                          description: op.description || op.summary || 'No description available',
                          inputSchema: finalInputSchema // Use the potentially populated schema
                      });
                   }
              }
          }
      }
      console.error(`[Tool Server] Responding to listTools with ${toolsList.length} tools.`);
      return { tools: toolsList };
  });

  // --- Handler for resources/list ---
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
     console.error('[Tool Server] Received listResources request via SDK handler - returning empty list.');
     return { resources: [] }; // We don't offer separate MCP resources
  });

  // --- Handler for prompts/list ---
   server.setRequestHandler(ListPromptsRequestSchema, async () => {
     console.error('[Tool Server] Received listPrompts request via SDK handler - returning empty list.');
     return { prompts: [] }; // We don't offer separate MCP prompts
  });

  // --- Connect Transport --- 
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error('[Tool Server] SDK Server connected to stdio transport and running.');
}

// --- Run the Server --- 
main().catch((error) => {
  console.error("[Tool Server] Fatal error during server startup or operation:", error);
  process.exit(1);
});