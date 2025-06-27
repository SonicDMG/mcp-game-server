import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/astradb'; // Import the initialized Db instance
import { v4 as uuidv4 } from 'uuid'; // Import UUID generator
import { generateImageWithPolling } from '@/lib/everartUtils'; // Import the new utility function
import { callLangflow } from '@/lib/langflow';
import { FinalTask } from '../types'; // Import FinalTask interface

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
  finalTask?: FinalTask; // The final epic task required to win
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

// Define interface for player record
interface PlayerRecord {
  _id: string;
  id: string;
  storyId: string;
  inventory: string[];
  gameProgress?: {
    itemsFound: string[];
    puzzlesSolved: string[];
    storyProgress: number;
  };
  status?: 'playing' | 'winner' | 'killed';
}

// Get a typed collection instance
const storiesCollection = db.collection<StoryRecord>('game_stories');
const locationsCollection = db.collection<LocationRecord>('game_locations');
const itemsCollection = db.collection<ItemRecord>('game_items');
const playersCollection = db.collection<PlayerRecord>('game_players');

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
    if (process.env.NODE_ENV !== 'production') {
      console.log('POST /api/game/stories - Received data:', JSON.stringify(inputData, null, 2));
    }

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

    console.info(`Creating story: ${title} (${storyId})`);

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
    console.info(`Story ID '${storyId}' is unique.`);

    // --- 4. Call Langflow World Generator ---
    const langflowApiUrl = process.env.LANGFLOW_API_URL;
    const langflowEndpoint = process.env.LANGFLOW_ENDPOINT;

    if (!langflowApiUrl || !langflowEndpoint) {
        console.error('POST /api/game/stories - Error: LANGFLOW_API_URL or LANGFLOW_ENDPOINT environment variables not set.');
        throw new Error('World generation service URL components are not configured.');
    }
    
    // Use the new Langflow utility
    let langflowOuterResponse;
    let generatedWorld;
    try {
      const result = await callLangflow({
        input_value: theme,
        session_id: storyId,
        apiUrl: langflowApiUrl,
        endpoint: langflowEndpoint
      });
      langflowOuterResponse = result.outer;
      generatedWorld = result.world;
    } catch (err) {
      console.error('POST /api/game/stories - Langflow call failed:', err);
      throw err;
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
        console.info('POST /api/game/stories - Extracted World Data String:', worldDataString);
    } catch (accessError) {
        // Catch errors during property access (though checks should prevent most)
        console.error('POST /api/game/stories - Error accessing nested path in Langflow response:', accessError);
        console.error('Outer Response:', JSON.stringify(langflowOuterResponse, null, 2));
        throw new Error('Error processing Langflow response structure.');
    }

    // --- NEW: Extract and validate challenges array ---
    const challenges = Array.isArray(generatedWorld.challenges) ? generatedWorld.challenges : [];
    if (challenges.length === 0) {
      console.warn('No challenges array found in generated world data. Artifact acquisition may not be gated by challenges.');
    } else {
      if (process.env.NODE_ENV !== 'production') {
        console.log(`Parsed ${challenges.length} challenges from generated world data.`);
      }
    }

    // --- NEW: Extract and validate finalTask ---
    const finalTask = generatedWorld.finalTask && typeof generatedWorld.finalTask === 'object' 
      ? generatedWorld.finalTask as FinalTask 
      : undefined;
    if (finalTask) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('Parsed finalTask from generated world data:', JSON.stringify(finalTask, null, 2));
      }
    } else {
      console.log('No finalTask found in generated world data, will use standard win condition.');
    }

    // --- Enforce MAX_ROOMS_PER_STORY ---
    const maxRooms = parseInt(process.env.MAX_ROOMS_PER_STORY || '10', 10);
    if (generatedWorld.locations.length > maxRooms) {
        console.error(`POST /api/game/stories - Error: Generated world has ${generatedWorld.locations.length} rooms, which exceeds the maximum allowed (${maxRooms}).`);
        return NextResponse.json({
            error: `Too many rooms generated: ${generatedWorld.locations.length}. The maximum allowed per story is ${maxRooms}. Please try a different theme or adjust your settings.`
        }, { status: 400 });
    }

    // +++ Add Debug Logging for Starting Location Items +++
    const startingLocData = generatedWorld.locations.find(loc => loc.id === generatedWorld.startingLocationId);
    if (process.env.NODE_ENV !== 'production') {
      console.log('>>> DEBUG: Parsed starting location data from Langflow:', JSON.stringify(startingLocData, null, 2));
    }
    // +++ End Debug Logging +++

    // --- Select Required Artifacts ---
    let requiredArtifacts = Array.isArray(generatedWorld.requiredArtifacts) && generatedWorld.requiredArtifacts.length > 0
      ? generatedWorld.requiredArtifacts
      : generatedWorld.items.filter((item: Omit<ItemRecord, 'storyId' | '_id'> & { canTake?: boolean }) => item.canTake === true).slice(0, 5).map(item => item.id);
    const MAX_REQUIRED_ARTIFACTS = parseInt(process.env.MAX_REQUIRED_ARTIFACTS || '5', 10);
    if (requiredArtifacts.length > MAX_REQUIRED_ARTIFACTS) {
      requiredArtifacts = requiredArtifacts
        .sort(() => Math.random() - 0.5)
        .slice(0, MAX_REQUIRED_ARTIFACTS);
    }
    if (process.env.NODE_ENV !== 'production') {
      console.log(`Selected required artifacts for story '${storyId}':`, requiredArtifacts);
    }

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

    // --- Win Path Validation ---
    // Ensure all required artifacts are present in the world
    const allItemIds = generatedWorld.items.map(item => item.id);
    const missingArtifacts = requiredArtifacts.filter((id: string) => !allItemIds.includes(id));
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
    const canReachGoal = bfs(generatedWorld.startingLocationId, goalRoomId, generatedWorld.locations);
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
    if (process.env.NODE_ENV !== 'production') {
      console.log('Attempting initial storiesCollection.insertOne() with artifacts...');
    }
    const storyInsertResult = await storiesCollection.insertOne(storyRecordInitial);
    console.info('Initial story document inserted successfully, DB ID:', storyInsertResult.insertedId);

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
    const locationInsertResult = await locationsCollection.insertMany(locationsToInsert);
    console.debug(`Inserted ${locationInsertResult.insertedCount} locations.`);
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
    console.debug(`Inserted ${itemInsertResult.insertedCount} items.`);
    if (itemInsertResult.insertedCount !== itemsToInsert.length) {
         console.warn(`Warning: Mismatch in item insertion count. Expected ${itemsToInsert.length}, inserted ${itemInsertResult.insertedCount}`);
         // Consider adding more robust error handling or cleanup here
    }

    // --- 9. Generate Image using EverArt Utils ---
    if (process.env.NODE_ENV !== 'production') {
      console.info('Attempting to generate story image via EverArt...');
    }
    const imagePrompt = `A digital painting game art banner for a text adventure game titled "${title}". Theme: ${theme}. Style: fantasy art, detailed, vibrant colors.`;
    generatedImageUrl = await generateImageWithPolling(imagePrompt);

    if (generatedImageUrl) {
        console.info(`EverArt image generated: ${generatedImageUrl}. Attempting to update story record...`);
        // --- 10. Update Story Record with Image URL, Challenges, and FinalTask ---
        const updateResult = await storiesCollection.updateOne(
            { id: storyId },
            { $set: {
                startingLocation: generatedWorld.startingLocationId,
                requiredArtifacts: requiredArtifacts,
                creationStatus: 'done',
                goalRoomId: goalRoomId,
                challenges: challenges, // Store challenges array
                ...(finalTask ? { finalTask: finalTask } : {}), // Store finalTask if present
                ...(generatedImageUrl ? { image: generatedImageUrl } : {})
              }
            }
        );
        if (updateResult.modifiedCount === 1) {
            console.info(`Successfully updated story ${storyId} with image URL, challenges, and finalTask.`);
        } else {
            // This shouldn't happen if the initial insert succeeded, but log a warning
            console.warn(`Warning: Failed to update story ${storyId} with image URL, challenges, and finalTask. Update modified count: ${updateResult.modifiedCount}`);
        }
    } else {
        console.warn(`Warning: EverArt image generation failed or timed out for story ${storyId}. Story record will not have an image URL.`);
        // Still update with challenges and finalTask even if image failed
        const updateResult = await storiesCollection.updateOne(
            { id: storyId },
            { $set: {
                startingLocation: generatedWorld.startingLocationId,
                requiredArtifacts: requiredArtifacts,
                creationStatus: 'done',
                goalRoomId: goalRoomId,
                challenges: challenges,
                ...(finalTask ? { finalTask: finalTask } : {}) // Store finalTask if present
              }
            }
        );
        if (updateResult.modifiedCount === 1) {
            console.info(`Successfully updated story ${storyId} with challenges and finalTask (no image).`);
        } else {
            console.warn(`Warning: Failed to update story ${storyId} with challenges and finalTask (no image). Update modified count: ${updateResult.modifiedCount}`);
        }
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
        startingLocationId: generatedWorld.startingLocationId,
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

    if (process.env.NODE_ENV !== 'production') {
      console.info(`GET /api/game/stories - Requested storyId: ${storyId || 'ALL'}`);
    }
    
    // Use the collection instance directly
    if (!storyId) {
      if (process.env.NODE_ENV !== 'production') {
        console.info('Finding all stories (storiesCollection.find({}))...');
      }
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
      if (process.env.NODE_ENV !== 'production') {
        console.info('Stories found:', stories.length);
      }

      // Fetch all players for all stories
      const allPlayers = await playersCollection.find({}).toArray();
      // Aggregate stats per story
      const statsMap = new Map();
      for (const player of allPlayers) {
        if (!player.storyId) continue;
        
        // Debug logging for specific story ID
        if (player.storyId === 'f6037f04-e785-4800-bbac-fe20b22aea62') {
          console.log('Player data for DOOM story:', {
            playerId: player._id,
            itemsFound: player.gameProgress?.itemsFound,
            foundCount: player.gameProgress?.itemsFound?.length,
            status: player.status
          });
        }

        const stats = statsMap.get(player.storyId) || { playerCount: 0, totalArtifactsFound: 0, killedCount: 0 };
        stats.playerCount += 1;
        // Find the maximum artifacts found by any player in this story
        const foundCount = player.inventory?.length || 0;
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
          killedCount: stats.killedCount ?? 0,
          startingLocation: story.startingLocation || ""
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
      if (process.env.NODE_ENV !== 'production') {
        console.log('Finding story with id: ${storyId} (storiesCollection.findOne({ id: storyId }))...');
      }
      const story = await storiesCollection.findOne({ id: storyId });
      if (process.env.NODE_ENV !== 'production') {
        console.log('Story found:', story ? story.id : 'None');
      }
      if (!story) {
        return NextResponse.json({ error: `Story with id ${storyId} not found`}, { status: 404 });
      }
      // Fetch players for this story
      const players = await playersCollection.find({ storyId }).toArray();
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
        killedCount,
        startingLocation: story.startingLocation || ""
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