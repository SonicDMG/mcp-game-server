import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/astradb'; // Import the initialized Db instance
import { PlayerState } from '../game/types'; // Import core types

// Define interface for Player DB record, adding _id and userId
interface PlayerRecord extends PlayerState { 
  _id: string; 
  userId: string; // Add userId here
}

// Get typed collection instance
const playersCollection = db.collection<PlayerRecord>('game_players');

/**
 * GET /api/leaderboard
 * Retrieves the leaderboard data (player progress) for a specific story.
 * Required for MCP tool operation (MCP 'getLeaderboard' operation).
 * Also used by the frontend for leaderboard display.
 */
// GET /api/leaderboard?storyId=...
export async function GET(request: NextRequest) {
  try {
    // Read storyId from query parameters
    const url = new URL(request.url);
    const storyId = url.searchParams.get('storyId');

    if (!storyId) {
      return NextResponse.json({ error: 'Story ID query parameter is required' }, { status: 400 });
    }

    console.log(`Fetching leaderboard data for story: ${storyId}...`);

    // Fetch players for the relevant story using the provided storyId
    const cursor = playersCollection.find({ storyId: storyId });
    
    // Define sort order
    cursor.sort({ 'gameProgress.storyProgress': -1 }); // -1 for descending

    // Optionally limit the leaderboard size
    // cursor.limit(10);

    const players = await cursor.toArray();
    console.log(`Found ${players.length} players for leaderboard.`);

    // Map player data to the format expected by the client/frontend
    const leaderboardData = players.map(player => ({
      id: player.userId, // Use userId instead of id
      room: player.currentLocation, // Use currentLocation for room
      inventory: player.inventory,
      // Goal condition is now correctly handled by the take handler setting progress to 100
      reachedGoal: player.gameProgress.storyProgress >= 100, 
      score: player.gameProgress.storyProgress,
      isWinner: player.status === 'winner' // Change 'status' to 'isWinner' and check the value
    }));

    return NextResponse.json(leaderboardData);

  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leaderboard data' }, 
      { status: 500 } 
    );
  }
} 