import EverArt from 'everart';

// Configuration Constants
const POLL_INTERVAL_MS = 5000; // Check every 5 seconds
const MAX_POLL_DURATION_MS = 60000; // Max wait time (60 seconds)
const EVERART_MODEL_ID = '5000'; // Default model, could be configurable

let everart: EverArt | null = null;

// Type for potential EverArt create responses
type EverArtGenerationResponse = 
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    | { id: string; [key: string]: any } // Single object with id
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    | Array<{ id: string; [key: string]: any }>; // Array of objects with id

/**
 * Initializes the EverArt SDK instance using the API key from environment variables.
 * Should be called once during application startup if possible, but safe to call multiple times.
 * @returns {boolean} True if initialization was successful or already initialized, false otherwise.
 */
function initializeEverartSdk(): boolean {
    if (everart) {
        return true; // Already initialized
    }
    const everartApiKey = process.env.EVERART_API_KEY;
    if (!everartApiKey) {
        console.warn('[EverArt Utils] EVERART_API_KEY environment variable not set. Image generation disabled.');
        return false;
    }
    try {
        everart = new EverArt(everartApiKey);
        console.info('[EverArt Utils] EverArt client initialized.');
        return true;
    } catch (sdkError) {
        console.error('[EverArt Utils] Failed to initialize EverArt SDK:', sdkError);
        everart = null; // Ensure it's null if init fails
        return false;
    }
}

/**
 * Generates an image using the EverArt API and polls for the result.
 * @param {string} prompt The text prompt for image generation.
 * @param {string} [modelId=EVERART_MODEL_ID] The EverArt model ID to use.
 * @returns {Promise<string | undefined>} The URL of the generated image, or undefined if generation fails or times out.
 */
export async function generateImageWithPolling(prompt: string, modelId: string = EVERART_MODEL_ID): Promise<string | undefined> {
    if (!initializeEverartSdk() || !everart) {
        console.warn('[EverArt Utils] SDK not initialized, cannot generate image.');
        return undefined;
    }

    let generationId: string | undefined = undefined;
    let imageUrl: string | undefined = undefined;

    console.info(`[EverArt Utils] Attempting to generate image with prompt: "${prompt}"`);
    try {
        // Call EverArt API to start generation
        const generationResponse: EverArtGenerationResponse = await everart.v1.generations.create(
            modelId,
            prompt,
            'txt2img'
        );
        console.info('[EverArt Utils] Raw response from EverArt create:', JSON.stringify(generationResponse, null, 2));

        // Extract generation ID (handle potential array response)
        if (Array.isArray(generationResponse) && generationResponse.length > 0 && generationResponse[0].id) {
            generationId = generationResponse[0].id;
        } else if (typeof generationResponse === 'object' && generationResponse !== null && 'id' in generationResponse && typeof generationResponse.id === 'string') {
            // Handle case where response might be a single object with an ID
            generationId = generationResponse.id; // No need for `as any` now
        } else {
            console.error('[EverArt Utils] Unexpected response structure from EverArt create:', generationResponse);
            generationId = undefined;
        }

        // Poll for result if we got an ID
        if (typeof generationId === 'string') {
            console.info(`[EverArt Utils] EverArt generation started with ID: ${generationId}. Polling for result...`);
            const startTime = Date.now();
            while (Date.now() - startTime < MAX_POLL_DURATION_MS) {
                await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
                const statusCheck = await everart.v1.generations.fetch(generationId);
                console.info(`[EverArt Utils] Polling status for ${generationId}: ${statusCheck.status}`);

                if (statusCheck.status === 'SUCCEEDED') {
                    imageUrl = statusCheck.image_url ?? undefined;
                    console.info(`[EverArt Utils] EverArt generation ${generationId} succeeded. Image URL: ${imageUrl}`);
                    break; // Exit loop
                } else if (statusCheck.status === 'FAILED' || statusCheck.status === 'CANCELED') {
                    console.error(`[EverArt Utils] EverArt generation ${generationId} failed or was canceled. Status: ${statusCheck.status}`);
                    break; // Exit loop
                }
                // Continue polling if STARTING or PROCESSING
            }

            if (!imageUrl && Date.now() - startTime >= MAX_POLL_DURATION_MS) {
                console.warn(`[EverArt Utils] EverArt generation ${generationId} timed out after ${MAX_POLL_DURATION_MS / 1000} seconds.`);
            }
        } else {
            console.error('[EverArt Utils] Failed to get a valid generation ID from EverArt create call.');
        }

    } catch (everartError) {
        console.error('[EverArt Utils] Error calling EverArt API:', everartError);
        // Fall through to return undefined
    }

    return imageUrl;
} 