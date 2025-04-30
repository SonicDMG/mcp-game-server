import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/astradb'; // Import the initialized Db instance
import { PlayerState, Story } from '../game/types'; // Import core types
// Remove imports for in-memory maps and Location type if no longer needed
// import { Location as GameLocation } from '../game/types'; 
// import { locations as inMemoryLocations, players as inMemoryPlayers } from '../game/gameState'; 

// Define interfaces for DB records adding _id 
interface PlayerRecord extends PlayerState { _id: string; }
// interface LocationRecord extends GameLocation { _id: string; } // No longer needed here
interface StoryRecord extends Story { _id: string; }

// Get typed collection instances
const playersCollection = db.collection<PlayerRecord>('game_players');
// const locationsCollection = db.collection<LocationRecord>('game_locations'); // No longer needed here
const storiesCollection = db.collection<StoryRecord>('game_stories');

/**
 * POST /api/reset
 * Resets a player's state for a given story (database-driven).
 * Not required for MCP tool operation.
 * May be used for development, admin, or testing purposes.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, storyId } = body;

    if (!userId || !storyId) {
      return NextResponse.json({ success: false, error: 'userId and storyId are required' }, { status: 400 });
    }

    console.log(`Reset requested for userId: ${userId}, storyId: ${storyId}`);

    // 1. Get Story Info (DB)
    const story = await storiesCollection.findOne({ id: storyId });
    if (!story) {
        return NextResponse.json({ success: false, error: `Story with id ${storyId} not found` }, { status: 404 });
    }
    const startingLocation = story.startingLocation;

    // 2. Reset Player State (DB)
    const playerDocId = `${storyId}_${userId}`;
    const playerResetPayload = {
      $set: {
        currentLocation: startingLocation,
        inventory: [],
        discoveredLocations: [startingLocation],
        gameProgress: { itemsFound: [], puzzlesSolved: [], storyProgress: 0 },
        storyId: storyId // Ensure storyId is set/reset on the player
      }
    };
    // Upsert the player state in case they didn't exist before reset
    const playerUpdateResult = await playersCollection.updateOne(
        { _id: playerDocId }, 
        playerResetPayload, 
        { upsert: true } // Use upsert: true
    );
    console.log(`Player ${playerDocId} state reset/created (DB). Matched: ${playerUpdateResult?.matchedCount}, Upserted: ${playerUpdateResult?.upsertedCount}, Modified: ${playerUpdateResult?.modifiedCount}`);

    // --- REMOVED In-Memory State Reset ---
    // The logic previously here updated in-memory maps (inMemoryPlayers, inMemoryLocations)
    // This is no longer necessary as the game state is primarily DB-driven.
    // --- End of REMOVED Block ---
    
    // Return success
    return NextResponse.json({ success: true, message: `Game state reset for player ${userId} in story ${storyId}` });

  } catch (error) {
    console.error('Error in /api/reset:', error);
    let errorMessage = 'Failed to reset game state';
    const status = 500;
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return NextResponse.json({ success: false, error: errorMessage }, { status: status });
  }
} 