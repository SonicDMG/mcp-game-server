import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/astradb';
import logger from '@/lib/logger';
import { Story, PlayerState, Location as GameLocation, GameItem } from '../../types'; // Adjusted path

// Interfaces for DB Records
interface StoryRecord extends Story { _id?: string; }
interface LocationRecord extends GameLocation { _id?: string; }
interface ItemRecord extends GameItem { _id?: string; }
interface PlayerRecord extends PlayerState { _id?: string; } // Assume PlayerState maps directly

// Get typed collection instances
const storiesCollection = db.collection<StoryRecord>('game_stories');
const locationsCollection = db.collection<LocationRecord>('game_locations');
const itemsCollection = db.collection<ItemRecord>('game_items');
const playersCollection = db.collection<PlayerRecord>('game_players');

/**
 * GET/DELETE /api/game/stories/[storyId]
 * GET: Retrieves the details of a specific story by its logical ID.
 * DELETE: Deletes a specific story and all associated data from the database.
 * Required for MCP tool operation (MCP 'getStoryById', 'deleteStory' operations).
 * Also used by the frontend for story management and display.
 */
// Use inline type for params
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function GET(request: NextRequest, context: any) { // Use 'any' and disable eslint rule
  // Extract params from context
  const params = context.params;
  const storyId = params.storyId;
  logger.debug(`GET /api/game/stories/${storyId} handler started`);

  if (!storyId) {
    return NextResponse.json({ success: false, error: 'Story ID parameter is required in the URL path.' }, { status: 400 });
  }

  try {
    // Find story by its logical id field
    const story = await storiesCollection.findOne({ id: storyId });

    if (!story) {
      logger.debug(`Story with id ${storyId} not found`);
      return NextResponse.json({ success: false, error: `Story with id '${storyId}' not found.` }, { status: 404 });
    }

    logger.info(`Found story ${storyId}: ${story.title}`);
    // Return the full story object (including database _id if present)
    return NextResponse.json({
      storyId: storyId,
      ...story
    });

  } catch (error) {
    logger.error(`Error in GET handler for story ${storyId}:`, error);
    let errorMessage = 'Failed to retrieve story due to an internal error.';
    const status = 500;
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return NextResponse.json({ success: false, error: errorMessage }, { status });
  }
}

// Use inline type for params
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function DELETE(request: NextRequest, context: any) { // Use 'any' and disable eslint rule
  // Extract params from context
  const params = context.params;
  const storyId = params.storyId;
  logger.info(`DELETE /api/game/stories/${storyId} handler started`);

  if (!storyId) {
    return NextResponse.json({ success: false, error: 'Story ID parameter is required in the URL path.' }, { status: 400 });
  }

  try {
    // 1. Verify the story exists before attempting deletions
    const storyToDelete = await storiesCollection.findOne({ id: storyId });
    if (!storyToDelete) {
        logger.debug(`Story with id ${storyId} not found for deletion`);
        return NextResponse.json({ success: false, error: `Story with id '${storyId}' not found.` }, { status: 404 });
    }

    logger.info(`Attempting to delete story ${storyId} and associated data`);

    // 2. Perform deletions concurrently
    const deletePromises = [
      storiesCollection.deleteOne({ id: storyId }),
      locationsCollection.deleteMany({ storyId: storyId }),
      itemsCollection.deleteMany({ storyId: storyId }),
      // Player _id is storyId_userId, so we can't directly use storyId.
      // We need to find players based on the storyId field within the document.
      playersCollection.deleteMany({ storyId: storyId })
    ];

    const results = await Promise.allSettled(deletePromises);

    // 3. Check results and log errors
    let success = true;
    const errors: string[] = [];
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        success = false;
        const collectionName = ['stories', 'locations', 'items', 'players'][index];
        logger.error(`Error deleting from ${collectionName} for story ${storyId}:`, result.reason);
        errors.push(`Failed to delete from ${collectionName}.`);
      } else {
         // Log success counts 
         const collectionName = ['stories', 'locations', 'items', 'players'][index];
         // Use a more specific type assertion if possible, otherwise keep 'any' but be aware
         // Assuming the result.value has a deletedCount property based on MongoDB driver 
         const deletedCount = (result.value as { deletedCount?: number })?.deletedCount ?? 'N/A'; 
         logger.debug(`Successfully deleted ${deletedCount} document(s) from ${collectionName} for story ${storyId}`);
      }
    });

    if (!success) {
      // Even if some deletions failed, the main story might be gone.
      // Return a 500 error indicating partial failure.
      return NextResponse.json({
        success: false,
        error: `Failed to completely delete story '${storyId}' and its associated data.`,
        details: errors
      }, { status: 500 });
    }

    // 4. Return success
    logger.info(`Successfully deleted story ${storyId} and all associated data`);
    return NextResponse.json({
      success: true,
      message: `Story '${storyId}' and all associated data deleted successfully.`
    });

  } catch (error) {
    logger.error(`Error in DELETE handler for story ${storyId}:`, error);
    let errorMessage = 'Failed to delete story due to an internal error.';
    const status = 500;
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return NextResponse.json({ success: false, error: errorMessage }, { status });
  }
}

// Optionally add PUT/PATCH handlers here later if needed for managing specific stories by ID 