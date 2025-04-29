import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/astradb'; // Import DB instance
import { PlayerState, Location as GameLocation, GameItem } from '../types'; // Import types

// Define interfaces for DB records
interface PlayerRecord extends PlayerState { _id: string; }
interface LocationRecord extends GameLocation { _id: string; }
interface ItemRecord extends GameItem { _id: string; }

// Get typed collection instances
const playersCollection = db.collection<PlayerRecord>('game_players');
const locationsCollection = db.collection<LocationRecord>('game_locations');
const itemsCollection = db.collection<ItemRecord>('game_items');

// POST /api/game/examine
export async function POST(request: NextRequest) {
  console.log('>>> ENTERING /api/game/examine handler (Database) <<<');
  interface ExamineRequestBody {
    userId?: string;
    storyId?: string;
    target?: string; // ID of the item or location exit to examine
  }
  try {
    const body: ExamineRequestBody = await request.json();
    const { userId, storyId, target } = body;

    if (!userId || !storyId || !target) {
      return NextResponse.json({
        success: false,
        error: 'User ID, Story ID, and Target are required',
        hint: 'Specify player, story, and what to examine'
      }, { status: 400 });
    }
    console.log(`>>> Processing examine for userId: ${userId}, story: ${storyId}, target: ${target} (Database) <<<`);

    const playerDocId = `${storyId}_${userId}`;

    // 1. Get Player State
    console.log(`>>> Fetching player: ${playerDocId} <<<`);
    const player = await playersCollection.findOne({ _id: playerDocId });
    if (!player) {
      return NextResponse.json({ success: false, error: 'Player not found.' }, { status: 404 });
    }
    if (player.storyId !== storyId) {
      return NextResponse.json({ success: false, error: 'Player story mismatch.' }, { status: 400 });
    }

    // 2. Get Current Location (needed to check exits and items in room)
    console.log(`>>> Fetching current location: id=${player.currentLocation}, storyId=${storyId} <<<`);
    const location = await locationsCollection.findOne({ id: player.currentLocation, storyId: storyId });
    if (!location) {
      return NextResponse.json({ success: false, error: 'Internal server error: Current location data missing' }, { status: 500 });
    }

    // 3. Check if target is an Item (in inventory or location)
    const isItemInInventory = player.inventory.includes(target);
    const isItemInLocation = location.items.includes(target);

    if (isItemInInventory || isItemInLocation) {
      console.log(`>>> Target ${target} identified as item. Fetching details... <<<`);
      const item = await itemsCollection.findOne({ id: target, storyId: storyId });
      if (item) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { _id, ...itemData } = item;
        console.log(`>>> Examine item successful: ${item.id} <<<`);
        return NextResponse.json({
          success: true,
          items: [itemData], // Return item details
          message: itemData.description,
          hint: itemData.canTake && isItemInLocation ? 'This item can be picked up' : undefined
        });
      } else {
        // Should not happen if item ID was in inventory/location list
        console.error(`Inconsistency: Item ${target} (story ${storyId}) not found in items collection.`);
        return NextResponse.json({ success: false, error: 'Internal error: Item data missing' }, { status: 500 });
      }
    }

    // 4. Check if target is a valid Exit from the current location
    if (location.exits.includes(target)) {
      console.log(`>>> Target ${target} identified as exit. Fetching destination details... <<<`);
      const destinationLocation = await locationsCollection.findOne({ id: target, storyId: storyId });
      if (destinationLocation) {
         // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { _id, ...locationData } = destinationLocation;
        console.log(`>>> Examine exit successful: ${destinationLocation.id} <<<`);
        return NextResponse.json({
          success: true,
          location: locationData, // Return destination details
          message: `Looking towards ${locationData.name}: ${locationData.description}`,
          hint: locationData.requirements?.item 
                  ? 'This area might require specific items to enter' 
                  : locationData.items?.length > 0 ? 'You might find items there.' : undefined
        });
      } else {
        // Should not happen if exit ID was in location exits list
        console.error(`Inconsistency: Exit location ${target} (story ${storyId}) not found in locations collection.`);
        return NextResponse.json({ success: false, error: 'Internal error: Exit location data missing' }, { status: 500 });
      }
    }

    // 5. Target not found as item or exit
    console.log(`>>> Target ${target} not found as item or exit for player ${userId} in location ${location.id}. <<<`);
    return NextResponse.json({
      success: false,
      error: 'You don\'t see that here to examine'
    });

  } catch (error) {
    console.error('Error in examine handler (Database):', error);
    let errorMessage = 'Failed to process examine command due to an internal error.';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
} 