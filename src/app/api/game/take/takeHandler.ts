import { getAbsoluteProxiedImageUrl } from '../types';
import type { PlayerState, Location, Story, GameItem } from '../types';

interface TakeHandlerServices {
  playersCollection: {
    findOne: (query: Record<string, unknown>) => Promise<(PlayerState & { _id: string }) | null>;
    updateOne: (filter: Record<string, unknown>, update: Record<string, unknown>) => Promise<unknown>;
  };
  locationsCollection: {
    findOne: (query: Record<string, unknown>) => Promise<(Location & { _id: string }) | null>;
    updateOne: (filter: Record<string, unknown>, update: Record<string, unknown>) => Promise<unknown>;
  };
  itemsCollection: {
    find: (query: Record<string, unknown>) => { toArray: () => Promise<(GameItem & { _id: string })[]> };
  };
  storiesCollection: {
    findOne: (query: Record<string, unknown>) => Promise<(Story & { _id: string; requiredArtifacts?: string[] }) | null>;
  };
  eventsCollection: {
    insertOne: (event: Record<string, unknown>) => Promise<unknown>;
  };
}

interface TakeActionInput {
  userId: string;
  target: string;
  storyId: string;
  request?: { headers: { get: (key: string) => string | null } };
}

export async function handleTakeAction(
  { userId, target: itemId, storyId, request }: TakeActionInput,
  services?: TakeHandlerServices
) {
  if (!services) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const db = require('@/lib/astradb').default;
    services = {
      playersCollection: db.collection('game_players'),
      locationsCollection: db.collection('game_locations'),
      itemsCollection: db.collection('game_items'),
      storiesCollection: db.collection('game_stories'),
      eventsCollection: db.collection('game_events'),
    };
  }
  if (!userId || !itemId || !storyId) {
    return { status: 400, body: {
      success: false,
      error: 'User ID, target item ID, and Story ID are required',
      hint: 'Specify what you want to take and from which story'
    }};
  }
  // Construct playerDocId using the provided storyId
  const playerDocId = `${storyId}_${userId}`;
  const story = await services.storiesCollection.findOne({ id: storyId });
  if (!story) {
    return { status: 500, body: { success: false, error: 'Internal server error: Story data missing' } };
  }
  const player = await services.playersCollection.findOne({ _id: playerDocId });
  if (!player) {
    return { status: 404, body: { success: false, error: 'Player not found. Please start the game first.' } };
  }
  if (player.storyId !== storyId) {
    return { status: 400, body: { success: false, error: 'Player story mismatch.' } };
  }
  const location = await services.locationsCollection.findOne({ id: player.currentLocation, storyId: storyId });
  if (!location) {
    return { status: 500, body: { success: false, error: 'Internal server error: Current location data missing' } };
  }
  const itemIndex = location.items.indexOf(itemId);
  if (itemIndex === -1) {
    return { status: 200, body: { success: false, message: `You don't see ${itemId} here.` } };
  }
  // Remove item from location
  location.items.splice(itemIndex, 1);
  await services.locationsCollection.updateOne({ _id: location._id }, { $set: { items: location.items } });
  // Add item to player inventory
  player.inventory = player.inventory || [];
  if (!player.inventory.includes(itemId)) {
    player.inventory.push(itemId);
    await services.playersCollection.updateOne({ _id: player._id }, { $set: { inventory: player.inventory } });
  }
  // Log take event
  await services.eventsCollection.insertOne({
    storyId,
    type: 'take',
    message: `${userId} picked up ${itemId}`,
    actor: userId,
    target: itemId,
    timestamp: new Date().toISOString(),
  });
  // Check if the item is a required artifact
  let specialMessage = '';
  if (story.requiredArtifacts && story.requiredArtifacts.includes(itemId)) {
    specialMessage = ' There is something special about this item...';
    player.gameProgress = player.gameProgress || {};
    player.gameProgress.itemsFound = player.gameProgress.itemsFound || [];
    if (!player.gameProgress.itemsFound.includes(itemId)) {
      player.gameProgress.itemsFound.push(itemId);
      await services.playersCollection.updateOne(
        { _id: player._id },
        { $set: { 'gameProgress.itemsFound': player.gameProgress.itemsFound } }
      );
    }
    // Log artifact event
    await services.eventsCollection.insertOne({
      storyId,
      type: 'artifact',
      message: `${userId} picked up required artifact ${itemId}`,
      actor: userId,
      target: itemId,
      timestamp: new Date().toISOString(),
    });
  }
  // Fetch updated inventory items
  const inventoryItems = (await services.itemsCollection.find({ _id: { $in: player.inventory } }).toArray()) as (GameItem & { _id: string })[];
  const inventoryWithImages = inventoryItems.map((item) => {
    const { _id, ...itemData } = item;
    return { ...itemData, image: (typeof getAbsoluteProxiedImageUrl !== 'undefined' && getAbsoluteProxiedImageUrl) ? getAbsoluteProxiedImageUrl(request ?? { headers: { get: () => null } }, itemData.image || '/images/item-placeholder.png') : itemData.image };
  });
  return {
    status: 200,
    body: {
      success: true,
      storyId,
      userId,
      message: `You took the item!${specialMessage}`,
      inventory: inventoryWithImages,
    }
  };
} 