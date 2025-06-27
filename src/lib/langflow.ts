import { LangflowWorldResponse } from '@/app/api/game/types';
import logger from './logger';

/**
 * Calls the Langflow API to generate world/story content or chat responses.
 * @param params.input_value - The main input (theme, prompt, etc.)
 * @param params.session_id - Session or story ID for tracking
 * @param params.apiUrl - Base Langflow API URL (e.g., from env)
 * @param params.endpoint - Langflow endpoint (e.g., flow UUID)
 * @param params.input_type - Input type (default: 'chat')
 * @param params.output_type - Output type (default: 'chat')
 * @param params.apiKey - Optional API key override (default: process.env.LANGFLOW_API_KEY)
 * @returns The parsed Langflow response (outer and inner world data)
 * @throws Error if the request fails or response is invalid
 */

// Type for the outer Langflow response structure
export interface LangflowOuterResponse {
  outputs?: Array<{
    outputs?: Array<{
      results?: {
        message?: {
          text?: string;
        };
        [key: string]: unknown;
      };
      [key: string]: unknown;
    }>;
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
}

export async function callLangflow({
  input_value,
  session_id,
  apiUrl,
  endpoint,
  input_type = 'chat',
  output_type = 'chat',
  apiKey
}: {
  input_value: string;
  session_id: string;
  apiUrl: string;
  endpoint: string;
  input_type?: string;
  output_type?: string;
  apiKey?: string;
}): Promise<{ outer: LangflowOuterResponse; world: LangflowWorldResponse }> {
  if (!apiUrl || !endpoint) {
    throw new Error('Langflow API URL and endpoint are required.');
  }
  const url = `${apiUrl}/api/v1/run/${endpoint}`;
  const payload = {
    input_value,
    input_type,
    output_type,
    session_id
  };
  const key = apiKey || process.env.LANGFLOW_API_KEY;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (key) headers['x-api-key'] = key;

  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });
  } catch (err) {
    logger.error('[Langflow] Network error:', err);
    throw new Error('Failed to reach Langflow API.');
  }
  if (!response.ok) {
    const errorBody = await response.text();
    logger.error(`[Langflow] Error ${response.status}:`, errorBody);
    throw new Error(`Langflow API error: ${response.status}`);
  }
  const raw = await response.text();
  let outer: LangflowOuterResponse;
  try {
    outer = JSON.parse(raw);
  } catch (e) {
    logger.error('[Langflow] Failed to parse outer JSON:', e, raw);
    throw new Error('Failed to parse Langflow outer response.');
  }
  const worldDataString: string | undefined = outer?.outputs?.[0]?.outputs?.[0]?.results?.message?.text;
  if (!worldDataString || typeof worldDataString !== 'string') {
    logger.error('[Langflow] No world data string at expected path:', JSON.stringify(outer, null, 2));
    throw new Error('Langflow response missing world data string.');
  }
  let world: LangflowWorldResponse;
  try {
    let parsed: unknown = worldDataString;
    if (typeof parsed === 'string') {
      try {
        parsed = JSON.parse(parsed);
      } catch (_e) {
        // Try to extract JSON from a string with preamble or code block
        const parsedStr = parsed as string;
        const jsonStart = parsedStr.indexOf('{');
        const jsonEnd = parsedStr.lastIndexOf('}');
        if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
          let jsonString = parsedStr.substring(jsonStart, jsonEnd + 1);
          jsonString = jsonString.replace(/```json|```/g, '').trim();
          parsed = JSON.parse(jsonString);
        } else {
          throw new Error('String did not contain a valid JSON object.');
        }
      }
    }
    if (typeof parsed === 'string') {
      parsed = JSON.parse(parsed);
    }
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'startingLocationId' in parsed &&
      'locations' in parsed &&
      'items' in parsed
    ) {
      world = parsed as LangflowWorldResponse;
    } else {
      throw new Error('Parsed world data does not match expected structure.');
    }
  } catch (e) {
    logger.error('[Langflow] Failed to parse world data JSON:', e, worldDataString);
    throw new Error('Failed to parse Langflow world data.');
  }
  return { outer, world };
} 