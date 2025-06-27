import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/astradb'; // Import DB instance
import logger from '@/lib/logger';
import { PlayerState, Location as GameLocation, GameItem, getAbsoluteProxiedImageUrl } from '../types'; // Import types
import type { Challenge } from '../types';
import { checkHasMessages, pollMessagesForUser } from '../utils/checkHasMessages';
import type { Message } from '../utils/checkHasMessages';

// Define interfaces for DB records
interface PlayerRecord extends PlayerState { _id: string; }
interface LocationRecord extends GameLocation { _id: string; }
interface ItemRecord extends GameItem { _id: string; }

// Get typed collection instances
const playersCollection = db.collection<PlayerRecord>('game_players');
const locationsCollection = db.collection<LocationRecord>('game_locations');
const itemsCollection = db.collection<ItemRecord>('game_items');

const ROOM_IMAGE_PLACEHOLDER = "/images/room-placeholder.png";
const ITEM_IMAGE_PLACEHOLDER = "/images/item-placeholder.png";

/**
 * POST /api/game/examine
 * Examines a specific item or feature in the player's current location.
 * Required for MCP tool operation (MCP 'examineTarget' operation).
 * May also be used by the frontend for direct API calls.
 */
// POST /api/game/examine
export async function POST(request: NextRequest) {
  logger.info('>>> ENTERING /api/game/examine handler <<<');
  interface ExamineRequestBody {
    userId?: string;
    storyId?: string;
    target?: string; // ID of the item or location exit to examine
  }
  let requestBody: ExamineRequestBody;
  try {
    requestBody = await request.json() as ExamineRequestBody;
    logger.info('[API /examine] Received request body:', JSON.stringify(requestBody));
    const { userId, storyId, target } = requestBody;

    if (!userId || !storyId || !target) {
      return NextResponse.json({
        success: false,
        error: 'User ID, Story ID, and Target are required',
        hint: 'Specify player, story, and what to examine'
      }, { status: 400 });
    }
    logger.info(`>>> Processing examine for userId: ${userId}, story: ${storyId}, target: ${target} (Database) <<<`);

    const playerDocId = `${storyId}_${userId}`;

    // 1. Get Player State
    logger.info(`>>> Fetching player: ${playerDocId} <<<`);
    const player = await playersCollection.findOne({ _id: playerDocId });
    if (!player) {
      return NextResponse.json({ success: false, needsPlayer: true, error: 'Player not found. Please start the game first.', hint: 'Call /api/game/start to create a new player.' }, { status: 200 });
    }

    // 2. Get Current Location (needed to check exits and items in room)
    logger.info(`>>> Fetching current location: id=${player.currentLocation}, storyId=${storyId} <<<`);
    const location = await locationsCollection.findOne({ id: player.currentLocation, storyId: storyId });
    if (!location) {
      return NextResponse.json({ success: false, error: 'Internal server error: Current location data missing' }, { status: 500 });
    }

    // 3. Check if target is an Item (in inventory or location)
    const isItemInInventory = player.inventory.includes(target);
    const isItemInLocation = location.items.includes(target);

    // --- Challenge Trigger Integration for Examine ---
    // Fetch story and check for unsolved challenges at this location that may be triggered by examining this item/feature
    const storiesCollection = db.collection('game_stories');
    const story = await storiesCollection.findOne({ id: storyId });
    let triggeredChallenges: Challenge[] = [];
    if (story && story.challenges) {
      triggeredChallenges = story.challenges.filter(
        (c: Challenge) => c.locationId === player.currentLocation && (!c.solvedBy || !c.solvedBy.includes(userId)) && (
          c.requirements?.item === target ||
          (Array.isArray(c.requirements?.items) && c.requirements.items.includes(target)) ||
          c.artifactId === target ||
          c.id === target
        )
      );
    }
    if (triggeredChallenges.length > 0) {
      let hasMessages = false;
      let messages: Message[] = [];
      if (userId && storyId) {
        hasMessages = await checkHasMessages(userId, storyId);
        if (hasMessages) {
          const pollResult = await pollMessagesForUser(userId, storyId);
          messages = pollResult.messages;
        }
      }
      return NextResponse.json({
        success: true,
        storyId: storyId,
        userId: userId,
        triggeredChallenges: triggeredChallenges.map(c => ({ ...c })), // ensure hints included
        message: `You have triggered a challenge: ${triggeredChallenges.map(c => c.name).join(', ')}`,
        hasMessages,
        messages
        // Agents: Present hints one-by-one as users attempt to solve
      });
    }

    if (isItemInInventory || isItemInLocation) {
      logger.info(`>>> Target ${target} identified as item. Fetching details... <<<`);
      const item = await itemsCollection.findOne({ id: target, storyId: storyId });
      if (item) {
        const { _id, ...itemData } = item;
        // Ensure image field is present
        itemData.image = getAbsoluteProxiedImageUrl(request, itemData.image || ITEM_IMAGE_PLACEHOLDER);
        logger.info(`>>> Examine item successful: ${item.id} <<<`);
        const contentArr = [
          itemData.image ? {
            type: 'image',
            image: itemData.image,
            alt: itemData.name || itemData.id
          } : null,
          {
            type: 'text',
            text: JSON.stringify(itemData, null, 2)
          }
        ].filter(Boolean);
        const image = contentArr[0]?.type === 'image' ? contentArr[0].image : null;
        const alt = contentArr[0]?.type === 'image' ? contentArr[0].alt : null;
        let hasMessages = false;
        let messages: Message[] = [];
        if (userId && storyId) {
          hasMessages = await checkHasMessages(userId, storyId);
          if (hasMessages) {
            const pollResult = await pollMessagesForUser(userId, storyId);
            messages = pollResult.messages;
          }
        }
        return NextResponse.json({
          success: true,
          storyId: storyId,
          userId: userId,
          items: [{ image, alt, content: contentArr }],
          message: itemData.description,
          hint: itemData.canTake && isItemInLocation ? 'This item can be picked up' : undefined,
          hasMessages,
          messages
        });
      } else {
        // Should not happen if item ID was in inventory/location list
        logger.error(`Inconsistency: Item ${target} (story ${storyId}) not found in items collection.`);
        return NextResponse.json({ success: false, error: 'Internal error: Item data missing' }, { status: 500 });
      }
    }

    // 4. Check if target is a valid Exit from the current location
    if (location.exits.some(exit => exit.targetLocationId === target)) {
      logger.info(`>>> Target ${target} identified as exit. Fetching destination details... <<<`);
      const destinationLocation = await locationsCollection.findOne({ id: target, storyId: storyId });
      if (destinationLocation) {
        const { _id, ...locationData } = destinationLocation;
        // Ensure image field is present
        locationData.image = getAbsoluteProxiedImageUrl(request, locationData.image || ROOM_IMAGE_PLACEHOLDER);
        logger.info(`>>> Examine exit successful: ${destinationLocation.id} <<<`);
        const contentArr = [
          locationData.image ? {
            type: 'image',
            image: locationData.image,
            alt: locationData.name || locationData.id
          } : null,
          {
            type: 'text',
            text: JSON.stringify(locationData, null, 2)
          }
        ].filter(Boolean);
        const image = contentArr[0]?.type === 'image' ? contentArr[0].image : null;
        const alt = contentArr[0]?.type === 'image' ? contentArr[0].alt : null;
        let hasMessages = false;
        let messages: Message[] = [];
        if (userId && storyId) {
          hasMessages = await checkHasMessages(userId, storyId);
          if (hasMessages) {
            const pollResult = await pollMessagesForUser(userId, storyId);
            messages = pollResult.messages;
          }
        }
        return NextResponse.json({
          success: true,
          storyId: storyId,
          userId: userId,
          location: { image, alt, content: contentArr },
          message: `Looking towards ${locationData.name}: ${locationData.description}`,
          hint: locationData.requirements?.item 
                  ? 'This area might require specific items to enter' 
                  : locationData.items?.length > 0 ? 'You might find items there.' : undefined,
          hasMessages,
          messages
        });
      } else {
        // Should not happen if exit ID was in location exits list
        logger.error(`Inconsistency: Exit location ${target} (story ${storyId}) not found in locations collection.`);
        return NextResponse.json({ success: false, error: 'Internal error: Exit location data missing' }, { status: 500 });
      }
    }

    // 5. Target not found as item or exit
    logger.info(`>>> Target ${target} not found as item or exit for player ${userId} in location ${location.id}. <<<`);
    return NextResponse.json({
      success: false,
      error: 'You don\'t see that here to examine'
    });

  } catch (error) {
    logger.error('Error in examine handler (Database):', error);
    let errorMessage = 'Failed to process examine command due to an internal error.';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
} 