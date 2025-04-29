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
      console.log(`>>> Item ${itemId} not found in location ${location.id}, returning 400 <<<`);
      return NextResponse.json({ success: false, error: `You don't see ${itemId} here.` }, { status: 400 });
    }

    // 4. Get Item Details from DB using item ID and story ID
    console.log(`>>> Fetching item: id=${itemId}, storyId=${storyId} <<<`); 
    const item = await itemsCollection.findOne({ id: itemId, storyId: storyId }); // Add storyId filter
    if (!item) {
       // This could mean the item ID exists in the location array but not in the items collection *for this story*
       console.error(`Inconsistency: Item ID ${itemId} listed in location ${location.id} but not found in game_items for story ${storyId}.`);
       return NextResponse.json({ success: false, error: `You see ${itemId}, but it seems to be illusory.` }, { status: 500 });
    }
    console.log(`>>> Found item: ${item.id} (${item.name}). Can take: ${item.canTake} <<<`);

    // 5. Check if item is takeable (from DB item data)
    if (!item.canTake) {
      console.log(`>>> Item ${itemId} cannot be taken, returning 400 <<<`);
      return NextResponse.json({ success: false, error: `You cannot take the ${item.name}.` }, { status: 400 });
    }

    // --- Update State in DB --- 
    console.log(`>>> Updating DB state for taking ${itemId} from ${location.id} by ${userId} <<<`);

    // Prepare updated data
    // const updatedLocationItems = location.items.filter(id => id !== itemId); // No longer removing from location
    const updatedPlayerInventory = [...player.inventory, itemId];
    const updatedItemsFound = player.gameProgress.itemsFound.includes(itemId)
      ? player.gameProgress.itemsFound
      : [...player.gameProgress.itemsFound, itemId];

    // Player payload remains
    const playerUpdatePayload = {
      $set: {
        inventory: updatedPlayerInventory,
        gameProgress: {
          ...player.gameProgress,
          itemsFound: updatedItemsFound
        }
      }
    };

    // --- Win Condition Check ---
    let playerWon = false;
    // Use updated inventory length for the check
    if (requiredArtifactsCount > 0 && updatedPlayerInventory.length >= requiredArtifactsCount) {
        // Double check: does inventory contain ALL required artifacts?
        const hasAllRequired = story.requiredArtifacts?.every(reqItem => updatedPlayerInventory.includes(reqItem)) ?? false;
        if (hasAllRequired) {
            console.log(`>>> WIN CONDITION MET for player ${userId} in story ${storyId}! <<<`);
            playerWon = true;
            // Add storyProgress update to the payload
            playerUpdatePayload.$set.gameProgress.storyProgress = 100;
        }
    }
    // ---------------------------

    // 7. Update Player in DB (add item to inventory, update itemsFound)
    console.log(`>>> Updating player ${player._id} inventory (Win status: ${playerWon}) <<<`);
    const playerUpdateResult = await playersCollection.updateOne({ _id: player._id }, playerUpdatePayload);
     if (!playerUpdateResult || playerUpdateResult.modifiedCount === 0) {
        // If player update fails, the item remains in the location (as we didn't remove it),
        // so the state isn't critically inconsistent, just the action failed.
        console.error(`Failed to update player inventory for _id ${player._id} (userId: ${userId}). Player Update Result:`, playerUpdateResult);
        return NextResponse.json({ success: false, error: 'Failed to update player inventory' }, { status: 500 });
     }
     console.log(`>>> Player ${player._id} inventory updated. <<<`);

    console.log(`Player ${userId} (DB _id: ${player._id}) took ${itemId} from ${location.id} (DB updated)`);

    // --- Prepare Response --- 
    // Fetch full details for the items in the *updated* inventory for the response
    // Use $in operator to fetch multiple items efficiently
    console.log(`>>> Fetching details for updated inventory: ${updatedPlayerInventory.join(', ')} <<<`);
    // Also filter items by storyId when fetching for inventory response
    const detailedInventoryItems = await itemsCollection.find({ 
        id: { $in: updatedPlayerInventory },
        storyId: storyId 
    }).toArray();
    
    // Map DB records to GameItem type for the response (excluding _id)
    const detailedInventory = detailedInventoryItems.map(dbItem => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { _id, ...itemData } = dbItem;
        return itemData;
    });

    let message = `You took the ${item.name}.`;
    if (playerWon) {
        message += `\n\n*** Congratulations! You have collected all the required artifacts for ${story.title}! You WIN! ***`;
    }

    console.log(`>>> Take successful, returning inventory count: ${detailedInventory.length} <<<`);
    // 8. Return success response
    return NextResponse.json({
      success: true,
      message: message,
      inventory: detailedInventory, // Return full item details (without _id)
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