import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/astradb'; // Import the initialized Db instance
import { PlayerState, Location as GameLocation } from '../types'; // Import types

// Define interfaces for DB records adding _id 
interface PlayerRecord extends PlayerState { _id: string; userId: string; } // Added userId based on leaderboard fix
interface LocationRecord extends GameLocation { _id: string; }

// Get typed collection instances
const playersCollection = db.collection<PlayerRecord>('game_players');
const locationsCollection = db.collection<LocationRecord>('game_locations');
// Comment out unused collection for now
// const storiesCollection = db.collection('game_stories'); 

export async function POST(request: NextRequest) {
  console.log('>>> ENTERING /api/game/move handler <<<'); 
  interface MoveRequestBody {
    userId?: string;
    target?: string;
    storyId?: string; // Add storyId to expected request body
  }
  let requestBody: MoveRequestBody;
  try {
    requestBody = await request.json() as MoveRequestBody;
    // Log request body after parsing
    console.log('[API /move] Received request body:', JSON.stringify(requestBody)); 

    // Destructure storyId as well
    const { userId, target: targetLocationId, storyId } = requestBody;

    // Add check for storyId
    if (!userId || !targetLocationId || !storyId) {
      console.log('>>> Missing userId, targetLocationId, or storyId returning 400 <<<');
      return NextResponse.json({
        success: false,
        error: 'User ID, target location ID, and Story ID are required',
        hint: 'Specify where you want to move and in which story'
      }, { status: 400 });
    }
    console.log(`>>> Processing move for userId: ${userId}, target: ${targetLocationId}, story: ${storyId} (Database) <<<`); // Keep this

    // --- Database Operations ---
    
    // Construct playerDocId using the provided storyId
    const playerDocId = `${storyId}_${userId}`;

    // 1. Get Player State from DB
    // console.log(`>>> Fetching player: ${playerDocId} <<<`); // Remove this
    const player = await playersCollection.findOne({ _id: playerDocId });
    if (!player) {
      console.error(`Player ${playerDocId} not found.`);
      // console.log('>>> Player not found, returning 404 <<<'); // Keep console.error
      return NextResponse.json({ success: false, error: 'Player not found. Please start the game first.' }, { status: 404 });
    }
    // Ensure player belongs to the correct story (safety check)
    if (player.storyId !== storyId) {
        console.error(`Player ${playerDocId} story mismatch. Found: ${player.storyId}, Expected: ${storyId}`);
        return NextResponse.json({ success: false, error: 'Player story mismatch.' }, { status: 400 });
    }
    // console.log(`>>> Found player. Current location: ${player.currentLocation} <<<`); // Remove this

    // 2. Get Current Location from DB using player's location and provided story ID
    // console.log(`>>> Fetching current location: id=${player.currentLocation}, storyId=${storyId} <<<`); // Remove this
    const currentLocation = await locationsCollection.findOne({ id: player.currentLocation, storyId: storyId });
    if (!currentLocation) {
      console.error(`Current location ${player.currentLocation} for player ${playerDocId} not found in story ${storyId}.`);
      // console.log('>>> Current location not found, returning 500 <<<'); // Keep console.error
      return NextResponse.json({ success: false, error: 'Internal error: Current location data missing' }, { status: 500 });
    }
    // console.log(`>>> Found current location: ${currentLocation.id}. Exits: ${currentLocation.exits?.join(', ') || 'None'} <<<`); // Remove this

    // 3. Get Destination Location from DB using target ID and provided story ID
    // console.log(`>>> Fetching destination location: id=${targetLocationId}, storyId=${storyId} <<<`); // Remove this
    const destinationLocation = await locationsCollection.findOne({ id: targetLocationId, storyId: storyId });
    if (!destinationLocation) {
      console.log(`>>> Destination location ${targetLocationId} not found in story ${storyId}, returning 404 <<<`); // Keep this
      return NextResponse.json(
        { success: false, error: `Location "${targetLocationId}" does not exist in this story.` }, 
        { status: 404 }
      );
    }
    // console.log(`>>> Found destination location: ${destinationLocation.id} <<<`); // Remove this

    // 4. Validate Exit Check using DB data
    // console.log('>>> Validating exit check (DB)... <<<'); // Remove this
    if (!currentLocation.exits || !currentLocation.exits.includes(targetLocationId)) {
      console.error(`Exit check failed: Cannot move from ${currentLocation.id} to ${targetLocationId}. Available exits: ${currentLocation.exits?.join(', ') || 'None'}`);
      // console.log('>>> Exit check failed, returning 400 <<<'); // Keep console.error
      return NextResponse.json({ success: false, error: `You cannot move to "${targetLocationId}" from here.` }, { status: 400 });
    }
    // console.log('>>> Exit check passed <<<'); // Remove this

    // 5. Requirements Check using DB data
    // console.log('>>> Checking requirements... <<<'); // Remove this
    if (destinationLocation.requirements) {
        // Item requirement
        if (destinationLocation.requirements.item && !player.inventory.includes(destinationLocation.requirements.item)) {
             // console.log(`>>> Requirement failed: Player lacks item ${destinationLocation.requirements.item} <<<`); // Remove this
             return NextResponse.json({
                success: false,
                error: `You cannot enter the ${destinationLocation.name} yet.`,
                hint: `You might need the ${destinationLocation.requirements.item}.`
            }, { status: 403 });
        }
        // Condition requirement (e.g., puzzle solved)
        if (destinationLocation.requirements.condition && destinationLocation.requirements.condition !== 'none') {
            // Assuming puzzle ID convention for now
            const requiredPuzzle = `puzzle_for_${destinationLocation.requirements.condition}`; 
            if (!player.gameProgress.puzzlesSolved.includes(requiredPuzzle)) {
                // console.log(`>>> Requirement failed: Player hasn't solved condition ${destinationLocation.requirements.condition} <<<`); // Remove this
                 return NextResponse.json({
                    success: false,
                    error: `You sense a mechanism preventing entry to the ${destinationLocation.name}.`,
                    hint: `Perhaps something needs to be solved or activated first.`
                }, { status: 403 });
            }
        }
    }
    // console.log('>>> Requirements passed <<<'); // Remove this

    // 6. Update Player State in DB
     // console.log(`>>> Updating player ${player._id} location to ${targetLocationId} in DB <<<`); // Remove this
     // Update current location and add destination to discoveredLocations atomically
     const playerUpdatePayload = {
       $set: { currentLocation: targetLocationId },
       $addToSet: { discoveredLocations: targetLocationId } // Adds only if not already present
     };
     const updateResult = await playersCollection.updateOne({ _id: player._id }, playerUpdatePayload);
 
     // Check if the update was successful (optional, but good practice)
     if (!updateResult || updateResult.modifiedCount === 0) {
         // This might happen if player was already in the target location for some reason
         console.warn(`Player ${player._id} move update to ${targetLocationId} failed or resulted in no changes. Result:`, updateResult); // Keep this
         // Decide if this is an error or just a warning. For now, proceed.
     }
 
     console.log(`Player ${player._id} moved to ${targetLocationId} (DB updated)`); // Keep this
 
    // --- Prepare Response --- 
    // console.log('>>> Move successful, preparing response <<<'); // Remove this
    // Destructure to omit the _id field from the response object
    const { _id: location_id, ...locationResponse } = destinationLocation;

     return NextResponse.json({
       success: true,
       location: locationResponse, // Return the destination location details (without _id)
       message: `You move to the ${destinationLocation.name}.\n${destinationLocation.description}`,
       hint: destinationLocation.items && destinationLocation.items.length > 0 ? 'You notice some items here.' : 'Remember to look around.'
    });

  } catch (error) {
    console.error('Error in move handler (Database):', error); // Keep this
    let errorMessage = 'Failed to process move command due to an internal error.';
    const status = 500;
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return NextResponse.json({ success: false, error: errorMessage }, { status });
  }
}