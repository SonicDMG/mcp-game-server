import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/astradb'; // Import the initialized Db instance
import { v4 as uuidv4 } from 'uuid'; // Import UUID generator
import { generateImageWithPolling } from '@/lib/everartUtils'; // Import the new utility function

/**
 * GET/POST /api/game/stories
 * GET: Lists all stories or fetches a specific story by ID.
 * POST: Creates a new story using a theme and AI world generation.
 * Required for MCP tool operation (MCP 'listStories', 'getStoryById', 'createGame' operations).
 * Also used by the frontend for story management and display.
 */

// Define interface for the story record based on observed structure
interface StoryRecord {
  _id?: string; // Make _id optional for insertion consistency
  id: string;
  title: string;
  description: string;
  startingLocation: string; // Will be set by Langflow response
  version: string;
  theme?: string; // Add theme to story record for potential future use/reference
  image?: string; // Add image field from types.ts (implicitly)
  creationStatus?: 'pending' | 'done' | 'error'; // Track story creation progress
  goalRoomId?: string; // The ID of the goal room for win path
}

interface LocationRecord {
    _id?: string; // Optional for insertion
    id: string; // User-defined ID (e.g., 'start', 'hallway')
    storyId: string; // Ensure storyId is present
    name: string;
    description: string;
    exits: { direction: string; targetLocationId: string; description?: string }[];
    items?: string[]; // IDs of items currently in this location
}

interface ItemRecord {
    _id?: string; // Optional for insertion
    id: string; // User-defined ID (e.g., 'key', 'gem')
    storyId: string; // Ensure storyId is present
    name: string;
    description: string;
    // flags? (e.g., takeable, usable)
}

// Interface for the expected input to the POST handler
interface CreateStoryInput {
  theme: string; // Theme is now mandatory
  id?: string;
  title?: string;
  description?: string;
  version?: string;
}

// Interface for the expected structure of the Langflow response
interface LangflowWorldResponse {
    startingLocationId: string;
    locations: Omit<LocationRecord, 'storyId' | '_id'>[]; // From Langflow, won't have storyId yet
    items: Omit<ItemRecord, 'storyId' | '_id'>[];       // From Langflow, won't have storyId yet
}

// Interface for the outer structure of the Langflow response 
interface LangflowOuterResponse {
  outputs?: Array<{
    outputs?: Array<{
      results?: {
        message?: {
          text?: string;
          // Add other potential fields if needed, or use Record<string, any>
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        [key: string]: any; // Allow other properties within results
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      [key: string]: any; // Allow other properties within inner outputs
    }>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any; // Allow other properties within outer outputs
  }>;
  // Add other potential top-level keys if needed
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

// Get a typed collection instance
const storiesCollection = db.collection<StoryRecord>('game_stories');
const locationsCollection = db.collection<LocationRecord>('game_locations');
const itemsCollection = db.collection<ItemRecord>('game_items');

// Define the structure for story information
export interface StoryInfo {
  storyId: string;
  name: string;
  description: string;
}

// Utility to clean up story titles
function cleanTitle(title: string): string {
  // Remove leading prefixes
  title = title.replace(/^(Story:|Game:|Title:|The Adventure of)\s*/i, '');
  // Remove anything in parentheses (byline-style)
  title = title.replace(/\s*\(.*?\)\s*/g, '');
  // Trim whitespace
  return title.trim();
}

export async function POST(request: NextRequest) {
  let storyId: string | undefined = undefined; // Define storyId in outer scope for potential cleanup
  let generatedImageUrl: string | undefined = undefined;
  try {
    const inputData: CreateStoryInput = await request.json();
    console.log('POST /api/game/stories - Received data:', JSON.stringify(inputData, null, 2));

    // --- 1. Validate Input ---
    if (!inputData || !inputData.theme) {
      console.error('POST /api/game/stories - Error: Theme is missing');
      return NextResponse.json({ error: 'Required field `theme` is missing' }, { status: 400 });
    }
    const theme = inputData.theme;

    // --- 2. Generate Metadata if Missing ---
    storyId = inputData.id || uuidv4(); // Generate unique ID if not provided
    let title = inputData.title || theme;
    title = cleanTitle(title);
    const description = inputData.description || `A game about ${theme}.`;
    const version = inputData.version || "1.0";

    console.log(`Resolved Story Metadata: ID=${storyId}, Title=${title}, Version=${version}`);

    // --- 3. Check for Duplicate Story ID ---
    const existingStory = await storiesCollection.findOne({ id: storyId }, { projection: { _id: 1 } });
    if (existingStory) {
        console.error(`POST /api/game/stories - Error: Story ID '${storyId}' already exists.`);
        // If the ID was provided by the user, return error. If generated, this indicates a UUID collision (highly unlikely).
        const errorMessage = inputData.id 
            ? `Story ID '${storyId}' already exists. Please provide a unique ID.`
            : `Generated Story ID '${storyId}' collision. Please try again.`;
        return NextResponse.json({ error: errorMessage }, { status: 409 }); // 409 Conflict
    }
    console.log(`Story ID '${storyId}' is unique.`);

    // --- 4. Call Langflow World Generator ---
    const langflowApiUrl = process.env.LANGFLOW_API_URL;
    const langflowEndpoint = process.env.LANGFLOW_ENDPOINT;

    if (!langflowApiUrl || !langflowEndpoint) {
        console.error('POST /api/game/stories - Error: LANGFLOW_API_URL or LANGFLOW_ENDPOINT environment variables not set.');
        throw new Error('World generation service URL components are not configured.');
    }
    
    // Construct the full URL by inserting the path segment
    const langflowUrl = `${langflowApiUrl}/api/v1/run/${langflowEndpoint}`;

    console.log(`Calling Langflow at ${langflowUrl} with theme: "${theme}"`);

    const langflowPayload = {
        "input_value": theme,
        "input_type": "chat", // Assuming these are constant for your flow
        "output_type": "chat",
        "session_id": storyId // Use the unique storyId as the session_id
    };

    console.log('Langflow Payload:', JSON.stringify(langflowPayload, null, 2)); // Log the payload

    const langflowResponse = await fetch(langflowUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(langflowPayload)
    });

    if (!langflowResponse.ok) {
        const errorBody = await langflowResponse.text();
        console.error(`POST /api/game/stories - Error from Langflow (${langflowResponse.status}): ${errorBody}`);
        throw new Error(`Failed to generate world content from Langflow service. Status: ${langflowResponse.status}`);
    }

    // Log the raw text response before attempting to parse JSON
    const rawResponseBody = await langflowResponse.text();
    console.log('POST /api/game/stories - Raw Langflow Response Body:', rawResponseBody);

    let langflowOuterResponse: LangflowOuterResponse; // Use defined interface
    try {
        // 1. Parse the outer Langflow response structure
        langflowOuterResponse = JSON.parse(rawResponseBody);
        console.log('POST /api/game/stories - Parsed Outer Langflow Response Object:', JSON.stringify(langflowOuterResponse, null, 2));
    } catch (parseError) {
        console.error('POST /api/game/stories - Error parsing outer Langflow JSON response:', parseError);
        console.error('Raw response was:', rawResponseBody); 
        throw new Error(`Failed to parse the main JSON response structure from Langflow service.`);
    }

    // 2. Extract the nested world data JSON string
    let worldDataString: string | undefined = undefined; // Explicitly allow undefined
    try {
        // Navigate the expected path, adding checks for safety
        worldDataString = langflowOuterResponse?.outputs?.[0]?.outputs?.[0]?.results?.message?.text;
        if (!worldDataString || typeof worldDataString !== 'string') {
             console.error('POST /api/game/stories - Error: Could not find world data string at expected path in Langflow response.');
             console.error('Outer Response:', JSON.stringify(langflowOuterResponse, null, 2));
             throw new Error('Langflow response structure did not contain world data string at expected path.');
        }
        console.log('POST /api/game/stories - Extracted World Data String:', worldDataString);
    } catch (accessError) {
        // Catch errors during property access (though checks should prevent most)
        console.error('POST /api/game/stories - Error accessing nested path in Langflow response:', accessError);
        console.error('Outer Response:', JSON.stringify(langflowOuterResponse, null, 2));
        throw new Error('Error processing Langflow response structure.');
    }

    // 3. Parse the extracted world data string
    let generatedWorld: LangflowWorldResponse;
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
                    // Remove code block markers if present
                    jsonString = jsonString.replace(/```json|```/g, '').trim();
                    try {
                        parsed = JSON.parse(jsonString);
                    } catch (_e2) {
                        throw new Error('Failed to extract and parse JSON from stringified world data.');
                    }
                } else {
                    throw new Error('String did not contain a valid JSON object.');
                }
            }
        }
        if (typeof parsed === 'string') {
            // Try parsing again (double-encoded)
            try {
                parsed = JSON.parse(parsed);
            } catch (_e) {
                throw new Error('Failed to parse double-encoded world data JSON string from Langflow response.');
            }
        }
        // Type guard: ensure parsed matches LangflowWorldResponse
        if (
          typeof parsed === 'object' &&
          parsed !== null &&
          'startingLocationId' in parsed &&
          'locations' in parsed &&
          'items' in parsed
        ) {
          generatedWorld = parsed as LangflowWorldResponse;
        } else {
          throw new Error('Parsed world data does not match expected structure.');
        }
        console.log('POST /api/game/stories - Parsed Inner World Data Object:', JSON.stringify(generatedWorld, null, 2));
    } catch (parseError) {
        console.error('POST /api/game/stories - Error parsing inner world data JSON string:', parseError);
        console.error('Extracted string was:', worldDataString);
        throw new Error(`Failed to parse the world data JSON string from Langflow response.`);
    }
    
    // Type check for robustness
    if (
      !generatedWorld ||
      typeof generatedWorld !== 'object' ||
      typeof generatedWorld.startingLocationId !== 'string' ||
      !Array.isArray(generatedWorld.locations) ||
      !Array.isArray(generatedWorld.items)
    ) {
      console.error('POST /api/game/stories - Parsed world data is missing required fields or has unexpected shape:', JSON.stringify(generatedWorld, null, 2));
      throw new Error('Parsed world data from Langflow is missing required fields or has unexpected shape.');
    }
    const startingLocationId = generatedWorld.startingLocationId;
    console.log(`Parsed world data: ${generatedWorld.locations.length} locations, ${generatedWorld.items.length} items. Starting: ${startingLocationId}`);

    // --- Enforce MAX_ROOMS_PER_STORY ---
    const maxRooms = parseInt(process.env.MAX_ROOMS_PER_STORY || '20', 10);
    if (generatedWorld.locations.length > maxRooms) {
        console.error(`POST /api/game/stories - Error: Generated world has ${generatedWorld.locations.length} rooms, which exceeds the maximum allowed (${maxRooms}).`);
        return NextResponse.json({
            error: `Too many rooms generated: ${generatedWorld.locations.length}. The maximum allowed per story is ${maxRooms}. Please try a different theme or adjust your settings.`
        }, { status: 400 });
    }

    // +++ Add Debug Logging for Starting Location Items +++
    const startingLocData = generatedWorld.locations.find(loc => loc.id === startingLocationId);
    console.log('>>> DEBUG: Parsed starting location data from Langflow:', JSON.stringify(startingLocData, null, 2));
    // +++ End Debug Logging +++

    // --- Select Required Artifacts --- 
    const takableItems = generatedWorld.items.filter(
        (item: Omit<ItemRecord, 'storyId' | '_id'> & { canTake?: boolean }) => item.canTake === true
    );
    if (takableItems.length < 5) {
        console.warn(`Warning: Story '${storyId}' generated only ${takableItems.length} takable items, fewer than the required 5.`);
        // Decide how to handle this - proceed with fewer, or throw error? 
        // For now, use all available takable items.
    }
    let requiredArtifacts = takableItems.slice(0, 5).map(item => item.id);
    console.log(`Selected required artifacts for story '${storyId}':`, requiredArtifacts);

    // --- Enforce MAX_REQUIRED_ARTIFACTS limit ---
    const MAX_REQUIRED_ARTIFACTS = parseInt(process.env.MAX_REQUIRED_ARTIFACTS || '5', 10);
    if (requiredArtifacts.length > MAX_REQUIRED_ARTIFACTS) {
      // Shuffle and select a random subset
      requiredArtifacts = requiredArtifacts
        .sort(() => Math.random() - 0.5)
        .slice(0, MAX_REQUIRED_ARTIFACTS);
    }
    // --- End Selection ---

    // --- Select Goal Room ---
    // For now, pick the last location as the goal room (could be improved with a special property)
    const goalRoom = generatedWorld.locations[generatedWorld.locations.length - 1];
    const goalRoomId = goalRoom?.id;
    if (!goalRoomId) {
      console.error('No goal room could be determined from generated locations.');
      return NextResponse.json({
        error: 'No goal room could be determined from generated locations. Story is invalid.'
      }, { status: 400 });
    }

    // --- Ensure all required artifacts are placed in rooms ---
    const startingLocId = startingLocationId;
    const eligibleRoomIds = generatedWorld.locations
      .map(loc => loc.id)
      .filter(id => id !== startingLocId && id !== goalRoomId);
    let roomIdx = 0;
    for (const artifactId of requiredArtifacts) {
      // Check if artifact is already placed in a room
      let placed = false;
      for (const loc of generatedWorld.locations) {
        if ((loc.items || []).includes(artifactId)) {
          placed = true;
          break;
        }
      }
      if (!placed && eligibleRoomIds.length > 0) {
        // Place artifact in a non-start/goal room, round-robin
        const targetRoomId = eligibleRoomIds[roomIdx % eligibleRoomIds.length];
        const targetLoc = generatedWorld.locations.find(l => l.id === targetRoomId);
        if (targetLoc) {
          if (!targetLoc.items) targetLoc.items = [];
          targetLoc.items.push(artifactId);
        }
        roomIdx++;
      } else if (!placed) {
        // Fallback: place in any room if no eligible
        const fallbackLoc = generatedWorld.locations.find(l => l.id !== goalRoomId) || generatedWorld.locations[0];
        if (fallbackLoc) {
          if (!fallbackLoc.items) fallbackLoc.items = [];
          fallbackLoc.items.push(artifactId);
        }
      }
    }

    // --- Win Path Validation ---
    // Ensure all required artifacts are present in the world
    const allItemIds = generatedWorld.items.map(item => item.id);
    const missingArtifacts = requiredArtifacts.filter(id => !allItemIds.includes(id));
    if (missingArtifacts.length > 0) {
      console.error('Win path validation failed: missing required artifacts:', missingArtifacts);
      return NextResponse.json({
        error: `Win path validation failed: missing required artifacts: ${missingArtifacts.join(', ')}`
      }, { status: 400 });
    }

    // --- Pathfinding: Ensure goal room is reachable from starting location ---
    function bfs(startId: string, targetId: string, locations: Omit<LocationRecord, 'storyId' | '_id'>[]): boolean {
      const visited = new Set<string>();
      const queue: string[] = [startId];
      while (queue.length > 0) {
        const current = queue.shift()!;
        if (current === targetId) return true;
        visited.add(current);
        const loc = locations.find(l => l.id === current);
        if (loc && Array.isArray(loc.exits)) {
          for (const exit of loc.exits) {
            if (exit.targetLocationId && !visited.has(exit.targetLocationId)) {
              queue.push(exit.targetLocationId);
            }
          }
        }
      }
      return false;
    }
    const canReachGoal = bfs(startingLocationId, goalRoomId, generatedWorld.locations);
    if (!canReachGoal) {
      console.error('Win path validation failed: goal room is not reachable from starting location.');
      return NextResponse.json({
        error: 'Win path validation failed: goal room is not reachable from starting location.'
      }, { status: 400 });
    }
    // (Optional: Check that all required artifacts are on a reachable path)

    // --- 5b. Generate Images for Locations and Items ---
    // Generate images for each location
    const locationImagePromises = generatedWorld.locations.map(async (loc) => {
        const prompt = `Pixel art scene of ${loc.name}: ${loc.description} (retro, pixel art, model 5000)`;
        const imageUrl = await generateImageWithPolling(prompt, '5000');
        return { ...loc, image: imageUrl };
    });
    const locationsWithImages = await Promise.all(locationImagePromises);

    // Generate images for each item
    const itemImagePromises = generatedWorld.items.map(async (item) => {
        const prompt = `Pixel art of ${item.name}: ${item.description} (retro, pixel art, model 5000)`;
        const imageUrl = await generateImageWithPolling(prompt, '5000');
        return { ...item, image: imageUrl };
    });
    const itemsWithImages = await Promise.all(itemImagePromises);

    // --- 6. Create Story Record (Initial Insert) ---
    // Insert story WITHOUT image URL first, but WITH requiredArtifacts
    const storyRecordInitial: Omit<StoryRecord, '_id' | 'image'> & { requiredArtifacts?: string[] } = {
        id: storyId,
        title: title,
        description: description,
        startingLocation: '', // Not known yet
        version: version,
        theme: theme,
        requiredArtifacts: [], // Not known yet
        creationStatus: 'pending',
        goalRoomId: goalRoomId
    };
    console.log('Attempting initial storiesCollection.insertOne() with artifacts...');
    const storyInsertResult = await storiesCollection.insertOne(storyRecordInitial);
    console.log('Initial story document inserted successfully, DB ID:', storyInsertResult.insertedId);

    // --- 7. Prepare and Insert Locations (with images) ---
    if (typeof storyId !== 'string') {
        console.error('Critical Error: storyId is not defined before location insertion.');
        throw new Error('Internal error: Story identifier missing during data preparation.');
    }
    const currentStoryIdForLocations = storyId;
    const locationsToInsert: LocationRecord[] = locationsWithImages.map(loc => ({
        ...loc,
        storyId: currentStoryIdForLocations
    }));
    console.log(`Attempting locationsCollection.insertMany() for ${locationsToInsert.length} locations...`);
    // Log the exact data being sent to insertMany
    // console.log('>>> DEBUG: Locations prepared for insertion:', JSON.stringify(locationsToInsert, null, 2)); 
    const locationInsertResult = await locationsCollection.insertMany(locationsToInsert);
    console.log(`Inserted ${locationInsertResult.insertedCount} locations.`);
    if (locationInsertResult.insertedCount !== locationsToInsert.length) {
         console.warn(`Warning: Mismatch in location insertion count. Expected ${locationsToInsert.length}, inserted ${locationInsertResult.insertedCount}`);
         // Consider adding more robust error handling or cleanup here if partial insertion is critical
    }

    // --- 8. Prepare and Insert Items (with images) ---
    if (typeof storyId !== 'string') {
        console.error('Critical Error: storyId is not defined before item insertion.');
        throw new Error('Internal error: Story identifier missing during data preparation.');
    }
    const currentStoryIdForItems = storyId;
    const itemsToInsert: ItemRecord[] = itemsWithImages.map(item => ({
        ...item,
        storyId: currentStoryIdForItems
    }));
    console.log(`Attempting itemsCollection.insertMany() for ${itemsToInsert.length} items...`);
    const itemInsertResult = await itemsCollection.insertMany(itemsToInsert);
    console.log(`Inserted ${itemInsertResult.insertedCount} items.`);
    if (itemInsertResult.insertedCount !== itemsToInsert.length) {
         console.warn(`Warning: Mismatch in item insertion count. Expected ${itemsToInsert.length}, inserted ${itemInsertResult.insertedCount}`);
         // Consider adding more robust error handling or cleanup here
    }

    // --- 9. Generate Image using EverArt Utils ---
    console.log('Attempting to generate story image via EverArt...');
    const imagePrompt = `A digital painting game art banner for a text adventure game titled "${title}". Theme: ${theme}. Style: fantasy art, detailed, vibrant colors.`;
    generatedImageUrl = await generateImageWithPolling(imagePrompt);

    if (generatedImageUrl) {
        console.log(`EverArt image generated: ${generatedImageUrl}. Attempting to update story record...`);
        // --- 10. Update Story Record with Image URL ---
        const updateResult = await storiesCollection.updateOne(
            { id: storyId },
            { $set: {
                startingLocation: startingLocationId,
                requiredArtifacts: requiredArtifacts,
                creationStatus: 'done',
                goalRoomId: goalRoomId,
                ...(generatedImageUrl ? { image: generatedImageUrl } : {})
              }
            }
        );
        if (updateResult.modifiedCount === 1) {
            console.log(`Successfully updated story ${storyId} with image URL.`);
        } else {
            // This shouldn't happen if the initial insert succeeded, but log a warning
            console.warn(`Warning: Failed to update story ${storyId} with image URL. Update modified count: ${updateResult.modifiedCount}`);
        }
    } else {
        console.warn(`Warning: EverArt image generation failed or timed out for story ${storyId}. Story record will not have an image URL.`);
    }

    // --- 11. Return Success ---
    return NextResponse.json({
        status: 'done',
        message: 'Game created successfully using Langflow generator.' + (!generatedImageUrl ? ' Image generation failed or timed out.' : ''),
        hint: 'You can now join the game as a player using the storyId. Start by creating or joining a player session.',
        storyId: storyId,
        title: title,
        theme: theme,
        storyDbId: storyInsertResult.insertedId,
        locationsGenerated: locationInsertResult.insertedCount,
        itemsGenerated: itemInsertResult.insertedCount,
        startingLocationId: startingLocationId,
        imageUrl: generatedImageUrl // Include the URL (or undefined) in the response
    });

  } catch (error) {
    // --- Error Handling ---
    console.error('Detailed error in /api/game/stories POST:', error);
    const status = 500; // Default status
    let errorMessage = 'Failed to create story using generation service'; 

    if (error instanceof Error) {
        errorMessage = error.message; 
    } else {
        errorMessage = String(error);
    }
    
    if (storyId) {
      await storiesCollection.updateOne(
        { id: storyId },
        { $set: { creationStatus: 'error' } }
      );
    }
    
    return NextResponse.json({ 
      status: 'error',
      error: errorMessage,
      hint: 'Check your theme and try again, or contact support if the problem persists.'
    }, { status: status });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const storyId = searchParams.get('id');

    console.log(`GET /api/game/stories - Requested storyId: ${storyId || 'ALL'}`);
    
    // Use the collection instance directly
    if (!storyId) {
      console.log('Finding all stories (storiesCollection.find({}))...');
      // Find all stories
      const stories = await storiesCollection.find({}, {
        projection: {
          id: 1,
          title: 1,
          description: 1,
          version: 1,
          theme: 1,
          image: 1,
          goalRoomId: 1,
          creationStatus: 1
        }
      }).toArray();
      console.log('Stories found:', stories.length);

      // Fetch all players for all stories
      const allPlayers = await db.collection('game_players').find({}).toArray();
      // Aggregate stats per story
      const statsMap = new Map();
      for (const player of allPlayers) {
        if (!player.storyId) continue;
        const stats = statsMap.get(player.storyId) || { playerCount: 0, totalArtifactsFound: 0, killedCount: 0 };
        stats.playerCount += 1;
        // Use the max number of artifacts found by any player
        const foundCount = player.gameProgress?.itemsFound?.length || 0;
        stats.totalArtifactsFound = Math.max(stats.totalArtifactsFound, foundCount);
        if (player.status === 'killed') stats.killedCount += 1;
        statsMap.set(player.storyId, stats);
      }
      // Attach stats to each story, with image as a content item first
      const storiesWithStats = stories.map(story => {
        const stats = statsMap.get(story.id) || { playerCount: 0, totalArtifactsFound: 0, killedCount: 0 };
        const storyObj = {
          storyId: story.id,
          id: story.id,
          title: story.title,
          description: story.description,
          version: story.version,
          theme: story.theme,
          goalRoomId: story.goalRoomId,
          creationStatus: story.creationStatus,
          playerCount: stats.playerCount ?? 0,
          totalArtifactsFound: stats.totalArtifactsFound ?? 0,
          killedCount: stats.killedCount ?? 0
        };
        return {
          ...storyObj,
          image: story.image || null,
          alt: story.title || story.id,
          content: [
            story.image ? {
              type: 'image',
              image: story.image,
              alt: story.title || story.id
            } : null,
            {
              type: 'text',
              text: JSON.stringify(storyObj, null, 2)
            }
          ].filter(Boolean)
        };
      });
      // Return stories with stats
      return NextResponse.json(storiesWithStats);
    } else {
      // When fetching by specific ID, get the full record
      console.log(`Finding story with id: ${storyId} (storiesCollection.findOne({ id: storyId }))...`);
      const story = await storiesCollection.findOne({ id: storyId });
      console.log('Story found:', story ? story.id : 'None');
      if (!story) {
        return NextResponse.json({ error: `Story with id ${storyId} not found`}, { status: 404 });
      }
      // Fetch players for this story
      const players = await db.collection('game_players').find({ storyId }).toArray();
      const playerCount = players.length;
      const totalArtifactsFound = players.reduce((max, p) => Math.max(max, p.gameProgress?.itemsFound?.length || 0), 0);
      const killedCount = players.filter(p => p.status === 'killed').length;
      // Return the full story object with stats, as a content array
      const storyObj = {
        storyId: story.id,
        id: story.id,
        title: story.title,
        description: story.description,
        version: story.version,
        theme: story.theme,
        goalRoomId: story.goalRoomId,
        creationStatus: story.creationStatus,
        playerCount,
        totalArtifactsFound,
        killedCount
      };
      return NextResponse.json({
        ...storyObj,
        image: story.image || null,
        alt: story.title || story.id,
        content: [
          story.image ? {
            type: 'image',
            image: story.image,
            alt: story.title || story.id
          } : null,
          {
            type: 'text',
            text: JSON.stringify(storyObj, null, 2)
          }
        ].filter(Boolean)
      });
    }
  } catch (error) {
    console.error('Detailed error in /api/game/stories GET:', error);
    const status = 500;
    let errorMessage = 'Failed to get stories';
    if (error instanceof Error) {
      errorMessage = error.message;
    } else {
      errorMessage = String(error);
    }
    return NextResponse.json({ error: errorMessage }, { status: status });
  }
} 