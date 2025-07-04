import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/astradb'; // Import DB instance
import logger from '@/lib/logger';
import { PlayerState, Location as GameLocation, GameItem, getAbsoluteProxiedImageUrl } from '../types'; // Correct path: ../types
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
 * POST /api/game/look
 * Returns details about the player's current location (description, items, exits).
 * Required for MCP tool operation (MCP 'lookAround' operation).
 * May also be used by the frontend for direct API calls.
 */
// POST /api/game/look
export async function POST(request: NextRequest) {
  logger.debug('POST /api/game/look handler started');
  interface LookRequestBody {
    userId?: string;
    storyId?: string;
  }
  let requestBody: LookRequestBody;
  try {
    requestBody = await request.json() as LookRequestBody;
    // Log request body after parsing
    logger.debug('Look request body:', requestBody); 
    const { userId, storyId } = requestBody;

    if (!userId || !storyId) {
      return NextResponse.json({
        success: false,
        error: 'User ID and Story ID are required',
        hint: 'Specify the player and story context'
      }, { status: 400 });
    }
    logger.debug(`Processing look for userId: ${userId}, story: ${storyId}`);

    const playerDocId = `${storyId}_${userId}`;

    // 1. Get Player State
    logger.debug(`Fetching player: ${playerDocId}`);
    const player = await playersCollection.findOne({ _id: playerDocId });
    if (!player) {
      return NextResponse.json({ success: false, error: 'Player not found.' }, { status: 404 });
    }
    if (player.storyId !== storyId) {
      return NextResponse.json({ success: false, error: 'Player story mismatch.' }, { status: 400 });
    }

    // 2. Get Current Location
    logger.debug(`Fetching location: id=${player.currentLocation}, storyId=${storyId}`);
    const location = await locationsCollection.findOne({ id: player.currentLocation, storyId: storyId });
    if (!location) {
      return NextResponse.json({ success: false, error: 'Internal server error: Current location data missing' }, { status: 500 });
    }

    // 3. Get Items in Location
    let visibleItems: GameItem[] = [];
    if (location.items && location.items.length > 0) {
      logger.debug(`Fetching details for items in location ${location.id}: ${location.items.join(', ')}`);
      const itemRecords = await itemsCollection.find({ 
        id: { $in: location.items },
        storyId: storyId 
      }).toArray();
      
      visibleItems = itemRecords.map(dbItem => {
        const { _id, ...itemData } = dbItem;
        return itemData;
      });
      logger.debug(`Found ${visibleItems.length} item details`);
    }

    // 4. Prepare Response
    logger.debug(`Preparing response for location db id: ${location._id}`); 
    const { _id, ...locationResponseData } = location; 
    // Ensure image field is present and proxied
    locationResponseData.image = getAbsoluteProxiedImageUrl(request, locationResponseData.image || ROOM_IMAGE_PLACEHOLDER);
    // Ensure all items have image field and are proxied
    visibleItems = visibleItems.map(item => ({ ...item, image: getAbsoluteProxiedImageUrl(request, item.image || ITEM_IMAGE_PLACEHOLDER) }));

    // Find other players in the same room
    const otherPlayers = await playersCollection.find({
      storyId: storyId,
      currentLocation: player.currentLocation,
      id: { $ne: userId }
    }).toArray();
    const players = otherPlayers.map(p => ({ id: p.id, status: p.status || 'playing' }));

    // Build content array for location
    const locationContent = [
      locationResponseData.image ? {
        type: 'image',
        image: locationResponseData.image,
        alt: locationResponseData.name || locationResponseData.id,
        display: 'always' // Add display directive
      } : null,
      {
        type: 'text',
        text: JSON.stringify(locationResponseData, null, 2)
      }
    ].filter(Boolean);

    // Build content arrays for items
    const itemsContent = visibleItems.map(item => ([
      item.image ? {
        type: 'image',
        image: item.image,
        alt: item.name || item.id,
        display: 'always' // Add display directive
      } : null,
      {
        type: 'text',
        text: JSON.stringify(item, null, 2)
      }
    ].filter(Boolean)));

    // Extract top-level image/alt for location
    const locationImage = locationContent[0]?.type === 'image' ? locationContent[0].image : null;
    const locationAlt = locationContent[0]?.type === 'image' ? locationContent[0].alt : null;

    // Extract top-level image/alt for each item
    const itemsWithTopLevel = itemsContent.map(contentArr => {
      const image = contentArr[0]?.type === 'image' ? contentArr[0].image : null;
      const alt = contentArr[0]?.type === 'image' ? contentArr[0].alt : null;
      return { image, alt, content: contentArr };
    });

    logger.info(`Look successful for userId: ${userId} in location: ${location.id}`);
    const result = {
      success: true,
      storyId: storyId,
      userId: userId,
      location: { image: locationImage, alt: locationAlt, content: locationContent },
      items: itemsWithTopLevel, // Each item as { image, alt, content }
      players, // List of other players in the same room
      message: location.description,
      hint: 'You can examine specific things you see for more details'
    };

    let hasMessages = false;
    let messages: Message[] = [];
    if (userId && storyId) {
      hasMessages = await checkHasMessages(userId, storyId);
      if (hasMessages) {
        const pollResult = await pollMessagesForUser(userId, storyId);
        messages = pollResult.messages;
      }
    }

    return NextResponse.json({ ...result, hasMessages, messages }, { status: 200 });

  } catch (error) {
    logger.error('Error in look handler:', error);
    let errorMessage = 'Failed to process look command due to an internal error.';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
} 