import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/astradb'; // Import DB instance
import { PlayerState, Location as GameLocation, GameItem } from '../types'; // Correct path: ../types

// Define interfaces for DB records
interface PlayerRecord extends PlayerState { _id: string; }
interface LocationRecord extends GameLocation { _id: string; }
interface ItemRecord extends GameItem { _id: string; }

// Get typed collection instances
const playersCollection = db.collection<PlayerRecord>('game_players');
const locationsCollection = db.collection<LocationRecord>('game_locations');
const itemsCollection = db.collection<ItemRecord>('game_items');

// POST /api/game/look
export async function POST(request: NextRequest) {
  console.log('>>> ENTERING /api/game/look handler <<< ');
  interface LookRequestBody {
    userId?: string;
    storyId?: string;
  }
  let requestBody: LookRequestBody;
  try {
    requestBody = await request.json() as LookRequestBody;
    // Log request body after parsing
    console.log('[API /look] Received request body:', JSON.stringify(requestBody)); 
    const { userId, storyId } = requestBody;

    if (!userId || !storyId) {
      return NextResponse.json({
        success: false,
        error: 'User ID and Story ID are required',
        hint: 'Specify the player and story context'
      }, { status: 400 });
    }
    console.log(`>>> Processing look for userId: ${userId}, story: ${storyId} (Database) <<<`);

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

    // 2. Get Current Location
    console.log(`>>> Fetching location: id=${player.currentLocation}, storyId=${storyId} <<<`);
    const location = await locationsCollection.findOne({ id: player.currentLocation, storyId: storyId });
    if (!location) {
      return NextResponse.json({ success: false, error: 'Internal server error: Current location data missing' }, { status: 500 });
    }

    // 3. Get Items in Location
    let visibleItems: GameItem[] = [];
    if (location.items && location.items.length > 0) {
      console.log(`>>> Fetching details for items in location ${location.id}: ${location.items.join(', ')} <<<`);
      const itemRecords = await itemsCollection.find({ 
        id: { $in: location.items },
        storyId: storyId 
      }).toArray();
      
      visibleItems = itemRecords.map(dbItem => {
        const { _id, ...itemData } = dbItem;
        return itemData;
      });
      console.log(`>>> Found ${visibleItems.length} item details. <<<`);
    }

    // 4. Prepare Response
    console.log(`Preparing response for location db id: ${location._id}`); 
    const { _id, ...locationResponseData } = location; 

    console.log(`>>> Look successful for userId: ${userId} in location: ${location.id} <<<`);
    return NextResponse.json({
      success: true,
      location: locationResponseData, // Return location details (without _id)
      items: visibleItems, // Return details of items in the location (without _id)
      message: location.description,
      hint: 'You can examine specific things you see for more details'
    });

  } catch (error) {
    console.error('Error in look handler (Database):', error);
    let errorMessage = 'Failed to process look command due to an internal error.';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
} 