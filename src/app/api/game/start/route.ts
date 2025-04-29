import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/astradb';
import { PlayerState, Location as GameLocation, Story } from '../types'; // Import necessary types

// Define interfaces for DB records, adding _id where needed
interface PlayerRecord extends PlayerState { _id: string; userId: string; }
interface LocationRecord extends GameLocation { _id: string; }
interface StoryRecord extends Story { _id: string; }

// Get typed collection instances
const playersCollection = db.collection<PlayerRecord>('game_players');
const locationsCollection = db.collection<LocationRecord>('game_locations');
const storiesCollection = db.collection<StoryRecord>('game_stories');

export async function POST(request: NextRequest) {
  console.log('>>> ENTERING /api/game/start handler <<< ');
  interface StartRequestBody {
    userId?: string;
    storyId?: string;
  }
  let requestBody: StartRequestBody;

  try {
    requestBody = await request.json() as StartRequestBody;
    // Log request body after parsing
    console.log('[API /start] Received request body:', JSON.stringify(requestBody)); 
    const { userId, storyId } = requestBody;

    if (!userId || !storyId) {
      console.log('>>> Missing userId or storyId, returning 400 <<<');
      return NextResponse.json({ success: false, error: 'User ID and Story ID are required' }, { status: 400 });
    }
    console.log(`>>> Processing start request for userId: ${userId}, storyId: ${storyId} <<<`);

    // Construct the unique player document ID
    const playerDocId = `${storyId}_${userId}`;

    // 1. Check if player already exists
    let player = await playersCollection.findOne({ _id: playerDocId });
    let message = "Welcome back!";

    if (player) {
      console.log(`>>> Player ${playerDocId} found. Retrieving state. <<<`);
      message = "Welcome back! Resuming your adventure.";
    } else {
      console.log(`>>> Player ${playerDocId} not found. Creating new game state. <<<`);
      
      // 2. If player doesn't exist, fetch the story to get starting location
      const story = await storiesCollection.findOne({ id: storyId }); // Find story by its logical ID
      if (!story) {
        console.error(`>>> Story with id ${storyId} not found. <<<`);
        return NextResponse.json({ success: false, error: `Story '${storyId}' not found.` }, { status: 404 });
      }
      
      if (!story.startingLocation) {
         console.error(`>>> Story ${storyId} is missing a startingLocation. <<<`);
         return NextResponse.json({ success: false, error: `Story '${storyId}' is not configured correctly (missing start).` }, { status: 500 });
      }

      // 3. Create the new player state document
      const newPlayer: PlayerRecord = {
        _id: playerDocId,       // Database document ID
        id: userId,             // Logical player ID
        userId: userId,
        storyId: storyId,
        currentLocation: story.startingLocation,
        inventory: [],
        discoveredLocations: [story.startingLocation],
        gameProgress: {
          itemsFound: [],
          puzzlesSolved: [],
          storyProgress: 0
        }
      };
      
      // Insert the new player document
      const insertResult = await playersCollection.insertOne(newPlayer);
      console.log(`>>> New player created with result:`, insertResult);
      
      // Use the newly created player object for the response
      player = newPlayer; 
      message = `Welcome to "${story.title}"! Your adventure begins now.`;
    }

    // 4. Fetch the player's current location details (either existing or starting)
    const currentLocation = await locationsCollection.findOne({ id: player.currentLocation, storyId: storyId });
    if (!currentLocation) {
      console.error(`>>> Critical Error: Location ${player.currentLocation} for story ${storyId} not found for player ${playerDocId}. <<<`);
      // This shouldn't happen if data is consistent, but handle it just in case.
      return NextResponse.json({ success: false, error: 'Internal error: Player\'s current location data is missing.' }, { status: 500 });
    }

    // 5. Prepare and return the response
    // Omit _id from player and location in the response for cleaner output
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { _id: player_id, ...playerResponse } = player;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { _id: location_id, ...locationResponse } = currentLocation;

    console.log(`>>> Start successful for ${playerDocId}. Current location: ${locationResponse.id} <<<`);
    return NextResponse.json({
      success: true,
      message: message,
      player: playerResponse,
      location: locationResponse
    });

  } catch (error) {
    console.error('Error in start handler:', error);
    let errorMessage = 'Failed to start game due to an internal error.';
    const status = 500;
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
       // Handle potential string errors from DB client?
       errorMessage = error;
    }
    // Handle JSON parsing error specifically
    if (error instanceof SyntaxError) {
        console.log('>>> Bad JSON format received <<<');
        errorMessage = "Invalid request format. Please send valid JSON.";
        return NextResponse.json({ success: false, error: errorMessage }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: errorMessage }, { status });
  }
} 