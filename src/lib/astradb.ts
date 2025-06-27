import { DataAPIClient, Db } from "@datastax/astra-db-ts";

// Retrieve Astra DB connection details from environment variables
// Use ASTRA_DB_ENDPOINT as specified by the user
const endpoint = process.env.ASTRA_DB_ENDPOINT; 
const token = process.env.ASTRA_DB_APPLICATION_TOKEN;
// Namespace/Keyspace is often part of the endpoint in v2, 
// or specified during collection access/operations, not typically at client init.
// Let's remove the namespace variable for now.

// Basic validation - check for the correct endpoint variable name
if (!endpoint || !token) {
  throw new Error(
    "ASTRA_DB_ENDPOINT and ASTRA_DB_APPLICATION_TOKEN environment variables are required."
  );
}

// Initialize DataAPIClient instance
// The client is initialized with the token only.
const client = new DataAPIClient(token);

// Get the Db instance using the endpoint.
// This Db object is what we'll use to access collections.
const db: Db = client.db(endpoint);

console.info(`AstraDB client initialized. DB instance created for endpoint: ${endpoint}`);

// Export the initialized Db instance for use in other modules
export default db; 