import Ajv from "ajv";
import { readFileSync } from "fs";
import fetch from "node-fetch";

const openapi = JSON.parse(readFileSync(new URL("../src/app/api/mcp/playerone/openapi/openapi.json", import.meta.url)));

(async () => {
  const ajv = new Ajv({ strict: false });

  // Register all schemas
  for (const [name, schema] of Object.entries(openapi.components.schemas)) {
    ajv.addSchema(schema, `#/components/schemas/${name}`);
  }

  const validate = ajv.getSchema("#/components/schemas/StoryRecord");

  const res = await fetch("http://localhost:3000/api/game/stories");
  if (!res.ok) {
    console.error(`❌ Failed to fetch /api/game/stories: ${res.status} ${res.statusText}`);
    process.exit(1);
  }
  const response = await res.json();
  let allValid = true;
  if (Array.isArray(response)) {
    response.forEach((item, idx) => {
      if (validate(item)) {
        console.log(`✅ Item #${idx + 1} is valid`);
      } else {
        allValid = false;
        console.error(`❌ Item #${idx + 1} failed:`, validate.errors);
      }
    });
  } else {
    if (validate(response)) {
      console.log("✅ Response is valid");
    } else {
      allValid = false;
      console.error("❌ Validation failed:", validate.errors);
    }
  }
  if (!allValid) process.exit(1);
})(); 