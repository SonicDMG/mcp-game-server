import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/astradb'; // Import the initialized Db instance
// Import types needed for DB interaction and response
import { PlayerState, Location as GameLocation, Story } from '../types'; 

// Define interfaces for DB records adding _id (matching the actual DB structure)
interface PlayerRecord extends PlayerState { _id: string; }
interface LocationRecord extends GameLocation { _id: string; }
// const itemsCollection = db.collection<ItemRecord>('game_items');
interface StoryRecord extends Story { _id: string; }

// Get typed collection instances
const playersCollection = db.collection<PlayerRecord>('game_players');
const locationsCollection = db.collection<LocationRecord>('game_locations');
// const itemsCollection = db.collection<ItemRecord>('game_items');
const storiesCollection = db.collection<StoryRecord>('game_stories');
// Comment out unused collection for now
// const storiesCollection = db.collection('game_stories');

/**
 * POST /api/game/take
 * Allows the player to pick up a specified item from their current location.
 * Required for MCP tool operation (MCP 'takeItem' operation).
 * May also be used by the frontend for direct API calls.
 */
// POST /api/game/take
export async function POST(request: NextRequest) {
  console.log('>>> ENTERING /api/game/take handler <<<');
  interface TakeRequestBody {
    userId?: string;
    target?: string;
    storyId?: string; // Add storyId to expected request body
  }
  let requestBody: TakeRequestBody;
  try {
    requestBody = await request.json() as TakeRequestBody;
    // Log request body after parsing
    console.log('[API /take] Received request body:', JSON.stringify(requestBody));
    // Destructure storyId as well
    const { userId, target: itemId, storyId } = requestBody;

    // Add check for storyId
    if (!userId || !itemId || !storyId) {
      return NextResponse.json({
        success: false,
        error: 'User ID, target item ID, and Story ID are required',
        hint: 'Specify what you want to take and from which story'
      }, { status: 400 });
    }
    console.log(`>>> Processing take for userId: ${userId}, target: ${itemId}, story: ${storyId} (Database) <<<`);

    // --- Database Operations --- 

    // Construct playerDocId using the provided storyId
    const playerDocId = `${storyId}_${userId}`;

    // --- Pre-fetch Story Data for Win Condition Check ---
    console.log(`>>> Fetching story details for win condition: ${storyId} <<<`);
    const story = await storiesCollection.findOne({ id: storyId });
    if (!story) {
      // Should not happen if player exists for story, but handle defensively
      console.error(`Story ${storyId} not found during take operation.`);
      return NextResponse.json({ success: false, error: 'Internal server error: Story data missing' }, { status: 500 });
    }
    const requiredArtifactsCount = story.requiredArtifacts?.length ?? 0;
    console.log(`>>> Story ${storyId} requires ${requiredArtifactsCount} artifacts to win. <<<`);
    // -----------------------------------------------------

    // 1. Get Player State from DB
    console.log(`>>> Fetching player: ${playerDocId} <<<`);
    const player = await playersCollection.findOne({ _id: playerDocId });
    if (!player) {
      console.error(`Player ${playerDocId} not found in database.`);
      return NextResponse.json({ success: false, error: 'Player not found. Please start the game first.' }, { status: 404 });
    }
    // Ensure player belongs to the correct story (safety check)
    if (player.storyId !== storyId) {
        console.error(`Player ${playerDocId} story mismatch. Found: ${player.storyId}, Expected: ${storyId}`);
        return NextResponse.json({ success: false, error: 'Player story mismatch.' }, { status: 400 });
    }
    console.log(`>>> TAKE HANDLER: Fetched player. Current location: ${player.currentLocation}. StoryId: ${player.storyId} <<<`);

    // 2. Get Current Location from DB using player's currentLocation and provided storyId
    console.log(`>>> Fetching location: id=${player.currentLocation}, storyId=${storyId} <<<`);
    const location = await locationsCollection.findOne({ id: player.currentLocation, storyId: storyId });
    if (!location) {
      console.error(`Inconsistency: Player ${playerDocId}'s current location ${player.currentLocation} (story: ${storyId}) not found in database.`);
      return NextResponse.json({ success: false, error: 'Internal server error: Current location data missing' }, { status: 500 });
    }
    console.log(`>>> Found current location: ${location.id}. Items: ${location.items?.join(', ') || 'None'} <<<`);

    // 3. Check if item exists in the location's item list (from DB)
    const itemIndex = location.items.indexOf(itemId);
    if (itemIndex === -1) {
      return NextResponse.json({ success: false, message: `You don't see ${itemId} here.` }, { status: 200 });
    }

    // ... rest of the function ...
  } catch (error) {
    console.error('Error in POST /api/game/take:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}