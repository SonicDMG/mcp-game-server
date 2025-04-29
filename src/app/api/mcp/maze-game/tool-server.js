const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL, URLSearchParams } = require('url'); // Added URLSearchParams

const PORT = 3001; // Choose a port different from your main app (Next.js default is 3000)
const MANIFEST_PATH = path.join(__dirname, 'openapi.json');
const GAME_API_BASE_URL = 'http://localhost:3000/api/game'; // URL of your running Next.js game API

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

try {
  openapiManifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
  console.log(`Successfully loaded OpenAPI manifest from ${MANIFEST_PATH}`);
} catch (error) {
  console.error(`Failed to load OpenAPI manifest: ${error.message}`);
  process.exit(1); // Exit if manifest can't be loaded
}

const server = http.createServer(async (req, res) => {
  const requestUrl = new URL(req.url, `http://${req.headers.host}`);
  const pathname = requestUrl.pathname;
  const method = req.method;

  console.log(`[Tool Server] Received request: ${method} ${pathname}`);

  // CORS Headers - Important for browser-based MCP clients
  res.setHeader('Access-Control-Allow-Origin', '*'); // Allow any origin (adjust in production)
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle CORS preflight requests
  if (method === 'OPTIONS') {
    res.writeHead(204); // No Content
    res.end();
    return;
  }

  // Serve the OpenAPI manifest
  if (method === 'GET' && (pathname === '/' || pathname === '/openapi.json')) {
    console.log('[Tool Server] Serving OpenAPI manifest...');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(openapiManifest));
    return;
  }

  // Endpoint to execute API calls based on operationId
  if (method === 'POST' && pathname === '/execute') {
    console.log('[Tool Server] Received /execute request...');
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', async () => {
      let requestPayload;
      try {
        requestPayload = JSON.parse(body);
      } catch (parseError) {
        console.error('[Tool Server] Invalid JSON in /execute request:', parseError);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON request body' }));
        return;
      }

      const { operationId, parameters } = requestPayload;

      if (!operationId || !parameters) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Missing operationId or parameters in request body' }));
        return;
      }

      console.log(`[Tool Server] Attempting to execute operation: ${operationId}`);

      // Find the operation details in the manifest
      const operationDetails = findOperationDetails(operationId);

      if (!operationDetails) {
        console.error(`[Tool Server] Operation ID not found in manifest: ${operationId}`);
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: `Operation ID '${operationId}' not found in manifest` }));
        return;
      }

      const targetPath = operationDetails.path;
      const targetMethod = operationDetails.method;
      let targetUrl = GAME_API_BASE_URL + targetPath;
      let fetchOptions = {
        method: targetMethod,
        headers: {
          'Content-Type': 'application/json',
          // Add any other required headers if needed, e.g., Authorization
        },
      };

      console.log(`[Tool Server] Found operation: ${targetMethod} ${targetPath}`);
      console.log(`[Tool Server] Parameters received:`, parameters);

      // Prepare request based on method
      if (targetMethod === 'GET') {
        // Find query parameters defined in the manifest for this operation
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
        // For POST, assume the entire parameters object is the body
        fetchOptions.body = JSON.stringify(parameters);
      } else {
        // Handle other methods (PUT, DELETE, etc.) if needed
         console.error(`[Tool Server] Unsupported HTTP method: ${targetMethod}`);
         res.writeHead(501, { 'Content-Type': 'application/json' });
         res.end(JSON.stringify({ error: `HTTP method '${targetMethod}' not implemented by tool server` }));
         return;
      }

      console.log(`[Tool Server] Calling Game API: ${targetMethod} ${targetUrl}`);
      if (fetchOptions.body) {
        console.log(`[Tool Server] Request Body: ${fetchOptions.body}`);
      }

      // Call the actual game API
      try {
        const apiResponse = await fetch(targetUrl, fetchOptions);
        const responseBody = await apiResponse.json(); // Assume game API always returns JSON

        console.log(`[Tool Server] Game API Response Status: ${apiResponse.status}`);
        console.log(`[Tool Server] Game API Response Body:`, responseBody);

        // Forward the response (status and body) back to the MCP client
        res.writeHead(apiResponse.status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(responseBody));

      } catch (fetchError) {
        console.error(`[Tool Server] Error calling Game API (${targetUrl}):`, fetchError);
        res.writeHead(502, { 'Content-Type': 'application/json' }); // Bad Gateway
        res.end(JSON.stringify({ error: 'Failed to communicate with the underlying game API', details: fetchError.message }));
      }
    });
    return;
  }

  // Not Found
  console.log(`[Tool Server] Path not found: ${pathname}`);
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not Found' }));
});

server.listen(PORT, () => {
  console.log(`MCP Tool Server listening on http://localhost:${PORT}`);
  console.log(`Serving OpenAPI manifest at http://localhost:${PORT}/openapi.json`);
  console.log('Ensure your main game API server (Next.js) is running on http://localhost:3000');
}); 