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
 * 
 * *** TESTING & DEVELOPMENT UTILITY ***
 * 
 * Resets a player's state for a given story to initial conditions.
 * 
 * Purpose:
 * - Essential for integration testing (all test scripts depend on this)
 * - Development debugging and manual testing
 * - Admin operations for game state management
 * 
 * NOT exposed via MCP OpenAPI (intentionally) - this is not a game action
 * that players should use, but rather a utility for developers and tests.
 * 
 * Security: Consider restricting to development/testing environments only.
 */
export async function POST(request: NextRequest) {
  try {
    // Optional: Environment-based restrictions (uncomment to enable)
    // if (process.env.NODE_ENV === 'production') {
    //   return NextResponse.json({ 
    //     success: false, 
    //     error: 'Reset endpoint disabled in production for security' 
    //   }, { status: 403 });
    // }

    const body = await request.json();
    const { userId, storyId } = body;

    if (!userId || !storyId) {
      return NextResponse.json({ 
        success: false, 
        error: 'userId and storyId are required',
        usage: 'POST /api/reset with { "userId": "player1", "storyId": "story123" }'
      }, { status: 400 });
    }

    console.log(`🔄 Reset requested for userId: ${userId}, storyId: ${storyId}`);

    // 1. Get Story Info (DB)
    const story = await storiesCollection.findOne({ id: storyId });
    if (!story) {
        return NextResponse.json({ 
          success: false, 
          error: `Story with id ${storyId} not found` 
        }, { status: 404 });
    }
    const startingLocation = story.startingLocation;

    // 2. Reset Player State (DB) - Clean slate initialization
    const playerDocId = `${storyId}_${userId}`;
    const playerResetPayload = {
      $set: {
        userId: userId,
        storyId: storyId,
        currentLocation: startingLocation,
        inventory: [],
        discoveredLocations: [startingLocation],
        gameProgress: { 
          itemsFound: [], 
          puzzlesSolved: [], 
          storyProgress: 0 
        },
                 status: 'playing' as const, // Reset status to playing
        joinedAt: new Date().toISOString(),
        lastActive: new Date().toISOString()
      }
    };
    
    // Upsert the player state (create if doesn't exist, reset if exists)
    const playerUpdateResult = await playersCollection.updateOne(
        { _id: playerDocId }, 
        playerResetPayload, 
        { upsert: true }
    );
    
    const action = playerUpdateResult.upsertedCount ? 'created' : 'reset';
    console.log(`✅ Player ${playerDocId} state ${action} (DB). Matched: ${playerUpdateResult?.matchedCount}, Upserted: ${playerUpdateResult?.upsertedCount}, Modified: ${playerUpdateResult?.modifiedCount}`);
    
    // Return success with detailed info
    return NextResponse.json({ 
      success: true, 
      message: `Game state ${action} for player ${userId} in story ${storyId}`,
      resetTo: {
        location: startingLocation,
        inventory: [],
        status: 'playing'
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error in /api/reset:', error);
    let errorMessage = 'Failed to reset game state due to internal error';
    const status = 500;
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return NextResponse.json({ 
      success: false, 
      error: errorMessage,
      hint: 'Check server logs for detailed error information'
    }, { status: status });
  }
} 