import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/astradb';
import { Story, Location as GameLocation, GameItem } from '../types'; // Assuming types are defined
import EverArt from 'everart'; // Import EverArt SDK

// Interfaces for DB Records (adjust if your types.ts includes _id)
interface StoryRecord extends Story { _id?: string; }
interface LocationRecord extends GameLocation { _id?: string; }
interface ItemRecord extends GameItem { _id?: string; }

// Get typed collection instances
const storiesCollection = db.collection<StoryRecord>('game_stories');
const locationsCollection = db.collection<LocationRecord>('game_locations');
const itemsCollection = db.collection<ItemRecord>('game_items');

// Helper to generate a basic storyId from title
function generateStoryId(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove invalid chars
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .replace(/_+/g, '_') // Replace multiple underscores
    .replace(/^-+|-+$/g, '') // Trim leading/trailing underscores
    .substring(0, 50); // Limit length
}

// Interface for the request body
interface CreateGameRequestBody {
  title: string;
  theme?: string;
  setting?: string;
  goal?: string;
  difficulty?: 'Easy' | 'Medium'; // Restrict difficulty for simplicity
}

// --- EverArt Configuration ---
// IMPORTANT: Set EVERART_API_KEY in your environment variables!
const everartApiKey = process.env.EVERART_API_KEY;
let everart: EverArt | null = null;
if (everartApiKey) {
    try {
        everart = new EverArt(everartApiKey);
        console.log('[API /create] EverArt client initialized.');
    } catch (sdkError) {
        console.error('[API /create] Failed to initialize EverArt SDK:', sdkError);
        // Proceed without EverArt if SDK fails to init
    }
} else {
  console.warn('[API /create] EVERART_API_KEY environment variable not set. Image generation disabled.');
}

// Polling configuration
const POLL_INTERVAL_MS = 5000; // Check every 5 seconds
const MAX_POLL_DURATION_MS = 60000; // Max wait time (e.g., 60 seconds)
const EVERART_MODEL_ID = '5000'; // Default model (FLUX1.1 pro) - Make configurable later if needed

export async function POST(request: NextRequest) {
  console.log('>>> ENTERING /api/game/create handler <<<');
  let requestBody: CreateGameRequestBody;

  try {
    requestBody = await request.json();
    console.log('[API /create] Received request body:', JSON.stringify(requestBody));

    // --- Basic Validation & Defaults ---
    const { title } = requestBody;
    if (!title || typeof title !== 'string' || title.trim() === '') {
      return NextResponse.json({ success: false, error: 'Valid title is required' }, { status: 400 });
    }

    const theme = requestBody.theme || 'Adventure';
    const setting = requestBody.setting || 'Mysterious Place';
    const goal = requestBody.goal || 'Explore the area';
    const difficulty = requestBody.difficulty || 'Easy';
    const numLocations = difficulty === 'Medium' ? 5 : 3; // Easy: 3 rooms, Medium: 5 rooms

    const storyId = generateStoryId(title);
    if (!storyId) {
        return NextResponse.json({ success: false, error: 'Could not generate a valid story ID from the title' }, { status: 400 });
    }
    console.log(`>>> Generated storyId: ${storyId} for title: "${title}" <<<`);

    // --- Check for Existing Story ---
    const existingStory = await storiesCollection.findOne({ $or: [{ id: storyId }, { title: title }] });
    if (existingStory) {
      console.log(`>>> Story conflict: Found existing story with id "${existingStory.id}" or title "${existingStory.title}" <<<`);
      return NextResponse.json({ success: false, error: `A story with ID '${storyId}' or title '${title}' already exists.` }, { status: 409 }); // 409 Conflict
    }

    // --- Generate Story Content ---
    console.log(`>>> Generating content for story: ${storyId} (Difficulty: ${difficulty}, Locations: ${numLocations}) <<<`);
    const newLocations: LocationRecord[] = [];
    const locationIds: string[] = [];

    for (let i = 1; i <= numLocations; i++) {
      const locId = `room_${i}`;
      locationIds.push(locId);
      const locName = i === 1 ? `${setting} Entrance` : i === numLocations ? `${setting} Inner Sanctum` : `${setting} Area ${i}`;
      const locDescription = `A ${theme}-themed area (${locName}). ${i === 1 ? 'Your journey begins here.' : ''} ${goal ? `Goal: ${goal}`: ''}`;
      
      const exits: string[] = [];
      if (i > 1) exits.push(locationIds[i-2]); // Exit back to previous room
      if (i < numLocations) exits.push(`room_${i+1}`); // Exit to next room

      newLocations.push({
        id: locId,
        storyId: storyId,
        name: locName,
        description: locDescription,
        items: [], // Start empty, add items below if needed
        exits: exits,
        requirements: {} // Keep simple for now
      });
    }

    // Add a simple starting item (optional)
    const startingItem: ItemRecord = {
        id: 'note_from_creator',
        storyId: storyId,
        name: 'Note From Creator',
        description: `A hastily scribbled note: "Good luck with '${title}'! - The Generator"`,
        canTake: true,
        canUse: false,
    };
    // Place the item in the starting room
    if(newLocations.length > 0) {
        newLocations[0].items = [startingItem.id];
    }

    // --- Initiate EverArt Image Generation ---
    let imageUrl: string | undefined = undefined;
    let generationId: string | undefined = undefined;
    if (everart) {
        const prompt = `A digital painting game art banner for a text adventure game titled "${title}". Theme: ${theme}. Setting: ${setting}. Style: fantasy art, detailed, vibrant colors.`;
        console.log(`[API /create] Attempting to generate image with prompt: "${prompt}"`);
        try {
            const generationResponse = await everart.v1.generations.create(
                EVERART_MODEL_ID,
                prompt,
                'txt2img'
            );
            // Log the actual response object before trying to access .id
            console.log('[API /create] Raw response from EverArt create:', JSON.stringify(generationResponse, null, 2)); 
            
            // Check if the response is an array and has at least one element
            if (Array.isArray(generationResponse) && generationResponse.length > 0 && generationResponse[0].id) {
                 // Extract id from the first element of the array
                 generationId = generationResponse[0].id; 
            } else {
                 console.error('[API /create] Unexpected response structure from EverArt create:', generationResponse);
                 generationId = undefined; // Ensure it's undefined if structure is wrong
            }
            
            // --- Check if generationId was obtained before polling ---
            if (typeof generationId === 'string') { 
                console.log(`[API /create] EverArt generation started with ID: ${generationId}. Polling for result...`);

                // --- Polling Logic ---
                const startTime = Date.now();
                while (Date.now() - startTime < MAX_POLL_DURATION_MS) {
                    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS)); // Wait
                    // Now generationId is guaranteed to be a string here
                    const statusCheck = await everart.v1.generations.fetch(generationId); 
                    console.log(`[API /create] Polling status for ${generationId}: ${statusCheck.status}`);

                    if (statusCheck.status === 'SUCCEEDED') {
                        imageUrl = statusCheck.image_url ?? undefined; // Get the URL
                        console.log(`[API /create] EverArt generation ${generationId} succeeded. Image URL: ${imageUrl}`);
                        break; // Exit polling loop
                    } else if (statusCheck.status === 'FAILED' || statusCheck.status === 'CANCELED') {
                        console.error(`[API /create] EverArt generation ${generationId} failed or was canceled. Status: ${statusCheck.status}`);
                        break; // Exit polling loop
                    }
                    // Continue polling if status is STARTING or PROCESSING
                }

                if (!imageUrl && Date.now() - startTime >= MAX_POLL_DURATION_MS) {
                    console.warn(`[API /create] EverArt generation ${generationId} timed out after ${MAX_POLL_DURATION_MS / 1000} seconds.`);
                }

            } else {
                 console.error(`[API /create] Failed to get a valid generation ID from EverArt create call.`);
            }

        } catch (everartError) {
            console.error('[API /create] Error calling EverArt API:', everartError);
            // Continue story creation without image if API call fails
        }
    }

    // Create the main story record
    const newStory: StoryRecord = {
      id: storyId,
      title: title,
      description: `A new ${theme} story set in a ${setting}. Goal: ${goal}`,
      startingLocation: locationIds[0] || '', // Use generated locationIds
      version: '1.0-generated',
      requiredArtifacts: [],
      image: imageUrl // Add the generated image URL here (will be undefined if failed/disabled)
    };

    // --- Save to Database ---
    console.log(`>>> Saving new story (Image URL: ${newStory.image ?? 'N/A'}) <<<`);
    try {
      // Use Promise.all for concurrent insertion
      await Promise.all([
          storiesCollection.insertOne(newStory),
          locationsCollection.insertMany(newLocations),
          itemsCollection.insertOne(startingItem) // Add more items later if needed
      ]);
      console.log(`>>> Successfully created story ${storyId} in database <<<`);
    } catch (dbError) {
        console.error('>>> Database error during story creation:', dbError);
        // Attempt cleanup? (Difficult to do atomically without transactions)
        // For now, just report the error.
        return NextResponse.json({ success: false, error: 'Failed to save generated story data to database.' }, { status: 500 });
    }

    // --- Return Success Response ---
    return NextResponse.json({
      success: true,
      message: `Successfully created story '${title}' with ID '${storyId}'.${!imageUrl ? ' Image generation pending or failed.' : ''}`,
      storyId: storyId,
      title: title,
      imageUrl: imageUrl, // Include URL in response too
      details: {
          locationsGenerated: newLocations.length,
          startingLocation: newStory.startingLocation,
          startingItemId: startingItem?.id
      }
    });

  } catch (error) {
    console.error('Error in create handler:', error);
    let errorMessage = 'Failed to create game due to an internal error.';
    let status = 500;
    if (error instanceof SyntaxError) {
        console.log('>>> Bad JSON format received <<<');
        errorMessage = "Invalid request format. Please send valid JSON.";
        status = 400;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    return NextResponse.json({ success: false, error: errorMessage }, { status });
  }
} 