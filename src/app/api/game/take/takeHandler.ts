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
  const story = await services.storiesCollection.findOne({ id: storyId }) as (Story & { _id: string; requiredArtifacts?: string[]; goalRoomId?: string; finalTask?: { locationId: string; requiredArtifacts: string[]; hints: string[] } });
  if (!story) {
    return { status: 500, body: { success: false, error: 'Internal server error: Story data missing' } };
  }
  const player = await services.playersCollection.findOne({ _id: playerDocId });
  if (!player) {
    return { status: 200, body: { success: false, needsPlayer: true, error: 'Player not found. Please start the game first.', hint: 'Call /api/game/start to create a new player.' } };
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
  // Check if the item is a required artifact (awarded via challenge)
  if (story.requiredArtifacts && story.requiredArtifacts.includes(itemId)) {
    // Log blocked take event
    await services.eventsCollection.insertOne({
      storyId,
      type: 'take',
      message: `${userId} attempted to pick up required artifact ${itemId} (blocked)`,
      actor: userId,
      target: itemId,
      timestamp: new Date().toISOString(),
      blocked: true,
    });
    // Log artifact event for blocked attempt
    await services.eventsCollection.insertOne({
      storyId,
      type: 'artifact',
      message: `${userId} attempted to pick up required artifact ${itemId} (blocked)`,
      actor: userId,
      target: itemId,
      timestamp: new Date().toISOString(),
      blocked: true,
    });
    return {
      status: 200,
      body: {
        success: false,
        message: 'This artifact can only be obtained by completing its challenge.',
        hint: 'Find and complete the associated challenge to earn this artifact.'
      }
    };
  }
  // Do NOT remove item from location; allow all players to pick up all objects
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

  // --- WIN CONDITION CHECK (updated for finalTask) ---
  if (story) {
    if (story.finalTask) {
      const inFinalTaskRoom = player.currentLocation === story.finalTask.locationId;
      const hasAllFinalArtifacts = story.finalTask.requiredArtifacts.every((artifactId: string) => player.inventory.includes(artifactId));
      if (inFinalTaskRoom && hasAllFinalArtifacts) {
        await services.playersCollection.updateOne({ _id: player._id }, { $set: { status: 'winner' } });
        await services.eventsCollection.insertOne({
          storyId,
          type: 'win',
          message: `${userId} has completed the final task and won the game!`,
          actor: userId,
          timestamp: new Date().toISOString(),
        });
        return {
          status: 200,
          body: {
            success: true,
            storyId,
            userId,
            message: 'Congratulations! You have completed the final epic task and won the game!',
            win: true,
            inventory: inventoryWithImages,
            finalTask: story.finalTask,
            hint: story.finalTask.hints?.[0] || undefined
          }
        };
      }
    } else if (story.goalRoomId && story.requiredArtifacts) {
      const inGoalRoom = player.currentLocation === story.goalRoomId;
      const hasAllArtifacts = story.requiredArtifacts.every((artifactId: string) => player.inventory.includes(artifactId));
      if (inGoalRoom && hasAllArtifacts) {
        await services.playersCollection.updateOne({ _id: player._id }, { $set: { status: 'winner' } });
        await services.eventsCollection.insertOne({
          storyId,
          type: 'win',
          message: `${userId} has won the game!`,
          actor: userId,
          timestamp: new Date().toISOString(),
        });
        return {
          status: 200,
          body: {
            success: true,
            storyId,
            userId,
            message: 'Congratulations! You have collected all required artifacts and reached the goal. You win!',
            win: true,
            inventory: inventoryWithImages,
          }
        };
      }
    }
  }
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