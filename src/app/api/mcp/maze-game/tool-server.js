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

const MANIFEST_PATH = path.join(__dirname, 'openapi.json');
const GAME_API_BASE_URL = 'http://localhost:3000/api/game'; 

let openapiManifest = null;

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
  console.error(`[Tool Server] Successfully loaded OpenAPI manifest from ${MANIFEST_PATH}`);
} catch (error) {
  console.error(`[Tool Server] Failed to load OpenAPI manifest: ${error.message}`);
  process.exit(1);
}

// --- SDK Execute Function --- 
// This function handles the core logic of calling the game API
async function executeGameApi(operationId, parameters) {
   console.error(`[Tool Server] executeGameApi called for: ${operationId}`);
   const operationDetails = findOperationDetails(operationId);

    if (!operationDetails) {
      console.error(`[Tool Server] Operation ID not found: ${operationId}`);
      // Throw an error that the SDK can catch and format as JSON-RPC error
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
    let fetchOptions = {
        method: targetMethod,
        headers: { /*'Content-Type': 'application/json'*/ }, // Content-Type often not needed for DELETE/GET
    };
    console.error(`[Tool Server] Found operation: ${targetMethod} ${targetPath} -> ${finalTargetPath}`);
    console.error(`[Tool Server] Parameters received:`, parameters);

    // --- Add specific logging for targetMethod value and type ---
    console.error(`[Tool Server] DEBUG: Checking targetMethod. Value: "${targetMethod}", Type: ${typeof targetMethod}`);
    // --- End specific logging ---

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

    console.error(`[Tool Server] Calling Game API: ${targetMethod} ${targetUrl}`);
    if (fetchOptions.body) {
      console.error(`[Tool Server] Request Body: ${fetchOptions.body}`);
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
          console.error(`[Tool Server] Game API returned error status: ${apiResponse.status}`);
          // Log the body (prefer JSON if parsed, otherwise text)
          if (responseBodyJson !== null) {
              console.error('[Tool Server] Game API Error Body (JSON):', responseBodyJson);
          } else {
              console.error('[Tool Server] Game API Error Body (text):', responseBodyText);
          }
          // Throw an error using the parsed JSON or the raw text as data
          throw { code: -32000, message: `Game API Error: ${apiResponse.status}`, data: responseBodyJson ?? responseBodyText };
      }
      
      // Handle successful response
      if (responseBodyJson !== null) {
          // Successfully parsed JSON
          console.error(`[Tool Server] Game API Response Status: ${apiResponse.status}`);
          console.error(`[Tool Server] Game API Response Body (JSON):`, responseBodyJson);
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
       console.error(`[Tool Server] Error during fetch or processing (${targetUrl}):`, fetchError);
       // Re-throw fetch/parsing errors for the SDK to handle
       if (fetchError.code) throw fetchError; // Propagate our custom errors
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
    console.error('[Tool Server] Received execute request via SDK handler');
    const operationId = request.params.name; 
    const parameters = request.params.arguments; 
    if (!operationId || !parameters) {
       throw { code: -32602, message: "Invalid params: Missing tool name (operationId) or arguments (parameters)" };
    }
    const result = await executeGameApi(operationId, parameters);
    
    // Format the result based on expected MCP content structure
    // For listStories, return as a text block containing the JSON string
    // For other endpoints, we might need different formatting later
    if (operationId === 'listStories' && typeof result === 'object') {
        return { 
            content: [{ 
                type: 'text', 
                text: JSON.stringify(result, null, 2) // Stringify the JSON result
            }] 
        };
    } 
    
    // Default/Fallback: Attempt to return raw result wrapped in a basic structure
    // This might still fail validation for complex objects if not expected
    console.error(`[Tool Server] Warning: Returning raw result for ${operationId}. Validation might fail if structure is unexpected.`);
    return { 
        content: [{ 
            type: 'text', // Assume text as a fallback
            text: typeof result === 'string' ? result : JSON.stringify(result, null, 2) 
        }] 
    }; 
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
                      // Ensure inputSchema always has type: 'object'
                      let finalInputSchema = { 
                          type: 'object',
                          description: `Input schema for ${op.operationId}. Refer to tool definition for details.`,
                          properties: {},
                          required: []
                      };
                      
                      let originalSchemaSource = null;
                      if (method.toUpperCase() === 'POST' && op.requestBody?.content?.['application/json']?.schema) {
                         originalSchemaSource = op.requestBody.content['application/json'].schema;
                      } else if (method.toUpperCase() === 'GET' && op.parameters) {
                         // Build properties from query parameters if needed (for simpler cases)
                         const queryParamsSchema = { type: 'object', properties: {}, required: [] };
                         op.parameters.forEach(param => {
                             if (param.in === 'query') {
                                 queryParamsSchema.properties[param.name] = { 
                                     type: param.schema.type, 
                                     description: param.description 
                                 };
                                 if (param.required) {
                                     queryParamsSchema.required.push(param.name);
                                 }
                             }
                         });
                         originalSchemaSource = queryParamsSchema;
                      }
                      
                      // --- Resolve $ref and Merge --- 
                      let resolvedSchema = null;
                      if (originalSchemaSource && originalSchemaSource['$ref']) {
                           finalInputSchema.description += ` Defined by $ref: ${originalSchemaSource['$ref']}`;
                           const refPath = originalSchemaSource['$ref'].split('/');
                           if (refPath.length === 4 && refPath[0] === '#' && refPath[1] === 'components' && refPath[2] === 'schemas') {
                               const schemaName = refPath[3];
                               if (openapiManifest.components?.schemas?.[schemaName]) {
                                   resolvedSchema = openapiManifest.components.schemas[schemaName];
                                   console.error(`[Tool Server] Resolved $ref ${originalSchemaSource['$ref']} to schema ${schemaName}`);
                               } else {
                                   console.error(`[Tool Server] Warning: Could not resolve $ref ${originalSchemaSource['$ref']}. Schema ${schemaName} not found.`);
                               }
                           } else {
                               console.error(`[Tool Server] Warning: Could not parse $ref format: ${originalSchemaSource['$ref']}`);
                           }
                      } else {
                          // If not a $ref, the schema is inline (or built from query params)
                          resolvedSchema = originalSchemaSource;
                      }

                      // Reset properties and required for merging
                      finalInputSchema.properties = {};
                      finalInputSchema.required = [];

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
                      
                      // --- Handle allOf --- 
                      if (resolvedSchema && Array.isArray(resolvedSchema.allOf)) {
                          console.error(`[Tool Server] Processing allOf for ${op.operationId}`);
                          resolvedSchema.allOf.forEach(subSchema => {
                              let schemaPartToProcess = subSchema; // Assume inline initially
                              // Check if this part of allOf is a $ref
                              if (subSchema && subSchema['$ref']) {
                                  const refPath = subSchema['$ref'].split('/');
                                  if (refPath.length === 4 && refPath[0] === '#' && refPath[1] === 'components' && refPath[2] === 'schemas') {
                                      const schemaName = refPath[3];
                                      if (openapiManifest.components?.schemas?.[schemaName]) {
                                          console.error(`[Tool Server] Resolving nested $ref ${subSchema['$ref']} within allOf`);
                                          schemaPartToProcess = openapiManifest.components.schemas[schemaName];
                                      } else {
                                           console.error(`[Tool Server] Warning: Could not resolve nested $ref ${subSchema['$ref']} within allOf.`);
                                           schemaPartToProcess = null; // Skip if ref cannot be resolved
                                      }
                                  } else {
                                      console.error(`[Tool Server] Warning: Could not parse nested $ref format: ${subSchema['$ref']}`);
                                      schemaPartToProcess = null; // Skip if ref format is wrong
                                  }
                              }
                              // Process and merge the resolved part (either inline or from resolved $ref)
                              processAndMergeSchema(schemaPartToProcess);
                          });
                      } else {
                          // --- Handle simple schema (no allOf) --- 
                          // Process the single resolved schema (inline or from direct $ref)
                          processAndMergeSchema(resolvedSchema);
                      }
                      // --- End Schema Processing Logic ---

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

// Remove all the previous manual stdin/stdout handling code 