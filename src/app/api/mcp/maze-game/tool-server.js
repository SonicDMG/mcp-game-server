const fs = require('fs');
const path = require('path');
const { URL, URLSearchParams } = require('url');
// Import LOW-LEVEL Server class and Stdio transport
const { Server } = require('@modelcontextprotocol/sdk/server/index.js'); 
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
// Import the schemas for requests we need to handle
const { 
  CallToolRequestSchema, 
  ListToolsRequestSchema, 
  ListResourcesRequestSchema, 
  ListPromptsRequestSchema 
} = require('@modelcontextprotocol/sdk/types.js');
// Import Zod for schema validation (optional but recommended by SDK docs)
// If not already installed: npm install zod
// const { z } = require('zod'); 

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

    const targetPath = operationDetails.path;
    const targetMethod = operationDetails.method;
    let targetUrl = GAME_API_BASE_URL + targetPath;
    let fetchOptions = {
      method: targetMethod,
      headers: { 'Content-Type': 'application/json' },
    };
    console.error(`[Tool Server] Found operation: ${targetMethod} ${targetPath}`);
    console.error(`[Tool Server] Parameters received:`, parameters);

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
    } else if (targetMethod === 'POST') {
      fetchOptions.body = JSON.stringify(parameters);
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
      let responseBody;

      if (!apiResponse.ok) {
          console.error(`[Tool Server] Game API returned error status: ${apiResponse.status}`);
          try { 
             responseBody = await apiResponse.json(); 
             console.error('[Tool Server] Game API Error Body (JSON):', responseBody);
          } catch(e) { 
             responseBody = await apiResponse.text(); 
             console.error('[Tool Server] Game API Error Body (text):', responseBody);
          }
          // Throw an error to be converted to JSON-RPC error
          throw { code: -32000, message: `Game API Error: ${apiResponse.status}`, data: responseBody };
      }
      
      if (contentType && contentType.includes("application/json")) {
          responseBody = await apiResponse.json(); 
          console.error(`[Tool Server] Game API Response Status: ${apiResponse.status}`);
          console.error(`[Tool Server] Game API Response Body (JSON):`, responseBody);
          return responseBody; // Return the parsed JSON result for execute
      } else {
          responseBody = await apiResponse.text(); 
          console.error(`[Tool Server] Warning: Game API response was not JSON (Content-Type: ${contentType}). Body: ${responseBody.substring(0,100)}...`);
          // Throw an error as we expect JSON from successful calls
          throw { code: -32000, message: "Received non-JSON response from game API", data: responseBody };
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
      name: "MCPlayerOne-Maze-Game", 
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
    return { content: result }; 
  });

  // --- Handler for tools/list ---
  server.setRequestHandler(ListToolsRequestSchema, async (request) => {
      console.error('[Tool Server] Received listTools request via SDK handler');
      const toolsList = [];
      if (openapiManifest && openapiManifest.paths) {
          for (const path in openapiManifest.paths) {
              for (const method in openapiManifest.paths[path]) {
                   const op = openapiManifest.paths[path][method];
                   // Only list operations that have an operationId (our tool name)
                   if (op.operationId) { 
                      // Map OpenAPI schema to MCP Tool definition
                      // Note: This is a basic mapping. More complex schema conversion might be needed.
                      let inputSchema = { type: 'object', properties: {}, required: [] }; // Default empty schema
                      if (method.toUpperCase() === 'POST' && op.requestBody?.content?.['application/json']?.schema) {
                         // Attempt to use the existing schema or reference
                         inputSchema = op.requestBody.content['application/json'].schema;
                         // If it's a $ref, keep it as is (clients often resolve these)
                      } else if (method.toUpperCase() === 'GET' && op.parameters) {
                         // Build properties from query parameters for GET requests
                         inputSchema.properties = {};
                         inputSchema.required = [];
                         op.parameters.forEach(param => {
                             if (param.in === 'query') {
                                 inputSchema.properties[param.name] = { 
                                     type: param.schema.type, 
                                     description: param.description 
                                 };
                                 if (param.required) {
                                     inputSchema.required.push(param.name);
                                 }
                             }
                         });
                      }

                      toolsList.push({
                          name: op.operationId, // Use operationId as the tool name
                          description: op.description || op.summary || 'No description available',
                          inputSchema: inputSchema
                      });
                   }
              }
          }
      }
      console.error(`[Tool Server] Responding to listTools with ${toolsList.length} tools.`);
      return { tools: toolsList };
  });

  // --- Handler for resources/list ---
  server.setRequestHandler(ListResourcesRequestSchema, async (request) => {
     console.error('[Tool Server] Received listResources request via SDK handler - returning empty list.');
     return { resources: [] }; // We don't offer separate MCP resources
  });

  // --- Handler for prompts/list ---
   server.setRequestHandler(ListPromptsRequestSchema, async (request) => {
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