import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/astradb'; // Import the initialized Db instance
// Import types needed for DB interaction and response
import { GameItem, PlayerState, Location as GameLocation, Story } from '../types'; 

// Define interfaces for DB records adding _id (matching the actual DB structure)
interface PlayerRecord extends PlayerState { _id: string; }
interface LocationRecord extends GameLocation { _id: string; }
interface ItemRecord extends GameItem { _id: string; }
interface StoryRecord extends Story { _id: string; }

// Get typed collection instances
const playersCollection = db.collection<PlayerRecord>('game_players');
const locationsCollection = db.collection<LocationRecord>('game_locations');
const itemsCollection = db.collection<ItemRecord>('game_items');
const storiesCollection = db.collection<StoryRecord>('game_stories');
// Comment out unused collection for now
// const storiesCollection = db.collection('game_stories');

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
      console.log(`>>> Item ${itemId} not found in location ${location.id}, returning 200 with success:false <<<`);
      // Return 200 OK, but indicate failure in the body
      return NextResponse.json({ success: false, message: `You don't see ${itemId} here.` }, { status: 200 });
    }

    // 4. Get Item Details from DB using item ID and story ID
    console.log(`>>> Fetching item: id=${itemId}, storyId=${storyId} <<<`); 
    const item = await itemsCollection.findOne({ id: itemId, storyId: storyId });
    if (!item) {
        // Keep this as 404 - Data inconsistency
        console.error(`Inconsistency: Item ID ${itemId} listed in location ${location.id} but not found in game_items for story ${storyId}.`);
        return NextResponse.json({ success: false, error: `Item '${itemId}' not found in this area of story '${storyId}'.` }, { status: 404 }); 
    }

    const { _id: item_id, ...itemResponse } = item;

    // console.log(`>>> Examine successful for ${itemId} <<<`); // This log seems misplaced, commenting out

    // 5. Check if item is takeable (from DB item data)
    if (!itemResponse.canTake) {
      console.log(`>>> Item ${itemId} cannot be taken, returning 200 with success:false <<<`);
       // Return 200 OK, but indicate failure in the body
      return NextResponse.json({ success: false, message: `You cannot take the ${itemResponse.name}.` }, { status: 200 });
    }

    // Check if item is already in inventory
    if (player.inventory.includes(itemId)) {
      console.log(`>>> Item ${itemId} already in inventory, returning 200 with success:false <<<`);
       // Return 200 OK, but indicate failure in the body
      return NextResponse.json({ success: false, message: `You already have the ${itemResponse.name}.` }, { status: 200 });
    }

    // 6. Update Player State & Location State (atomicity is tricky here without transactions)
    const updatedInventory = [...player.inventory, itemId];
    const updatedLocationItems = location.items.filter((id) => id !== itemId);

    // Update player: Add item to inventory
    // Update location: Remove item from items array
    const playerUpdatePromise = playersCollection.updateOne({ _id: playerDocId }, { $set: { inventory: updatedInventory } });
    const locationUpdatePromise = locationsCollection.updateOne({ id: location.id, storyId: storyId }, { $set: { items: updatedLocationItems } });

    await Promise.all([playerUpdatePromise, locationUpdatePromise]);
    console.log(`>>> Player inventory and location items updated for ${itemId} <<<`);
    
    // --- Post-take Checks (e.g., Win Condition) ---
    // Re-fetch player state to check win condition based on *new* inventory
    const updatedPlayer = await playersCollection.findOne({_id: playerDocId});
    let playerWon = false;
    if (updatedPlayer && story && story.requiredArtifacts && story.requiredArtifacts.length > 0) {
        const artifactsOwned = updatedPlayer.inventory.filter(invItem => story.requiredArtifacts!.includes(invItem));
        if (artifactsOwned.length >= story.requiredArtifacts.length) {
             console.log(`>>> WIN CONDITION MET for ${playerDocId} in story ${storyId}! <<<`);
             playerWon = true;
            // Update status and progress upon winning
            await playersCollection.updateOne(
                { _id: playerDocId }, 
                { $set: { 
                    status: 'winner',
                    'gameProgress.storyProgress': 100
                  }
                }
            );
        }
    }
    // ---------------------------------------------
    
    // 7. Prepare and return success response
    const { _id: player_id, ...finalPlayerState } = updatedPlayer ?? player; // Use updated state if fetched
    
    let message = `You took the ${itemResponse.name}.`;
    if (playerWon) {
        message += `\n\n*** Congratulations! You have collected all the required artifacts for ${story.title}! You WIN! ***`;
    }

    console.log(`>>> Take successful, returning inventory count: ${finalPlayerState.inventory.length} <<<`);
    // 8. Return success response
    return NextResponse.json({
      success: true,
      message: message,
      inventory: finalPlayerState.inventory, // Return full item details (without _id)
      win: playerWon // Add a win flag to the response
    });

  } catch (error) {
    console.error('Error in take handler (Database):', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to process take command due to an internal server error.'
    }, { status: 500 });
  }
} 