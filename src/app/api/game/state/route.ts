import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/astradb';
import { PlayerState, Location as GameLocation } from '../types';

// Define interfaces for DB records
interface PlayerRecord extends PlayerState { _id: string; userId: string; }
interface LocationRecord extends GameLocation { _id: string; }

// Get typed collection instances
const playersCollection = db.collection<PlayerRecord>('game_players');
const locationsCollection = db.collection<LocationRecord>('game_locations');

/**
 * POST /api/game/state
 * Retrieves the current state of the game (player and location) for a specific user and story.
 * Required for MCP tool operation (MCP 'getGameState' operation).
 * May also be used by the frontend for direct API calls.
 */
export async function POST(request: NextRequest) {
  console.log('>>> ENTERING /api/game/state handler <<<');
  interface StateRequestBody {
    userId?: string;
    storyId?: string;
  }
  let requestBody: StateRequestBody;

  try {
    requestBody = await request.json() as StateRequestBody;
    // Log request body after parsing
    console.log('[API /state] Received request body:', JSON.stringify(requestBody));
    const { userId, storyId } = requestBody;

    if (!userId || !storyId) {
      console.log('>>> Missing userId or storyId, returning 400 <<<');
      return NextResponse.json({ success: false, error: 'User ID and Story ID are required' }, { status: 400 });
    }
    console.log(`>>> Processing state request for userId: ${userId}, storyId: ${storyId} <<<`);

    // Construct the unique player document ID
    const playerDocId = `${storyId}_${userId}`;

    // 1. Find the player
    const player = await playersCollection.findOne({ _id: playerDocId });
    if (!player) {
      console.log(`>>> Player ${playerDocId} not found, returning 404 <<<`);
      return NextResponse.json({ success: false, error: 'Player not found. Please start the game first.' }, { status: 404 });
    }

    // Ensure player belongs to the correct story (safety check)
    if (player.storyId !== storyId) {
        console.error(`Player ${playerDocId} story mismatch. Found: ${player.storyId}, Expected: ${storyId}`);
        return NextResponse.json({ success: false, error: 'Player story mismatch.' }, { status: 400 });
    }

    // 2. Find the player's current location
    const currentLocation = await locationsCollection.findOne({ id: player.currentLocation, storyId: storyId });
    if (!currentLocation) {
      console.error(`>>> Critical Error: Location ${player.currentLocation} for story ${storyId} not found for player ${playerDocId}. <<<`);
      return NextResponse.json({ success: false, error: 'Internal error: Player\'s current location data is missing.' }, { status: 500 });
    }

    // 3. Prepare and return the response (similar to /start)
    // Omit _id fields
    const { _id: player_id, ...playerResponse } = player;
    const { _id: location_id, ...locationResponse } = currentLocation;

    console.log(`>>> State retrieved successfully for ${playerDocId}. Current location: ${locationResponse.id} <<<`);
    return NextResponse.json({
      success: true,
      storyId: storyId,
      userId: userId,
      player: playerResponse,
      location: locationResponse
    });

  } catch (error) {
    console.error('Error in state handler:', error);
    let errorMessage = 'Failed to retrieve game state due to an internal error.';
    const status = 500;
     if (error instanceof SyntaxError) {
        console.log('>>> Bad JSON format received in /state <<<');
        errorMessage = "Invalid request format. Please send valid JSON.";
        return NextResponse.json({ success: false, error: errorMessage }, { status: 400 });
    } else if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
       errorMessage = error;
    }
    return NextResponse.json({ success: false, error: errorMessage }, { status });
  }
} 