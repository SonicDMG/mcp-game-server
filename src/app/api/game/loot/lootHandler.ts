import { getPlayerState, updatePlayerState } from '../dataService';
import type { PlayerState } from '../types';

interface LootHandlerServices {
  getPlayerState: (userId: string, storyId: string) => Promise<PlayerState & { _id: string } | null>;
  updatePlayerState: (player: PlayerState & { _id: string }) => Promise<boolean>;
  eventsCollection: {
    insertOne: (event: Record<string, unknown>) => Promise<unknown>;
  };
}

interface LootActionInput {
  playerId: string;
  targetId: string;
  storyId: string;
  items: string[];
}

export async function handleLootAction(
  { playerId, targetId, storyId, items }: LootActionInput,
  services?: LootHandlerServices
) {
  if (!services) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const db = require('@/lib/astradb').default;
    services = {
      getPlayerState,
      updatePlayerState,
      eventsCollection: db.collection('game_events'),
    };
  }
  if (!playerId || !targetId || !storyId || !Array.isArray(items)) {
    return { status: 400, body: { error: 'playerId, targetId, storyId, and items[] are required' } };
  }
  if (playerId === targetId) {
    return { status: 400, body: { error: 'You cannot loot yourself.' } };
  }
  const actor = await services.getPlayerState(playerId, storyId);
  const target = await services.getPlayerState(targetId, storyId);
  if (!actor || !target) {
    return { status: 404, body: { error: 'Player(s) not found' } };
  }
  if (actor.currentLocation !== target.currentLocation) {
    return { status: 400, body: { error: 'Target is not in the same room.' } };
  }
  if (target.status !== 'killed') {
    return { status: 400, body: { error: 'Target is not killed and cannot be looted.' } };
  }
  // Validate items are in target's inventory
  const invalidItems = items.filter((item: string) => !target.inventory.includes(item));
  if (invalidItems.length > 0) {
    return { status: 400, body: { error: `Invalid items: ${invalidItems.join(', ')}` } };
  }
  // Transfer items
  target.inventory = target.inventory.filter((item: string) => !items.includes(item));
  actor.inventory = [...actor.inventory, ...items];
  const successTarget = await services.updatePlayerState(target);
  const successActor = await services.updatePlayerState(actor);
  if (!successTarget || !successActor) {
    return { status: 500, body: { error: 'Failed to update player inventories.' } };
  }
  // Log loot event
  await services.eventsCollection.insertOne({
    storyId,
    type: 'loot',
    message: `${playerId} looted ${items.length} item(s) from ${targetId}`,
    actor: playerId,
    target: targetId,
    timestamp: new Date().toISOString(),
  });
  return {
    status: 200,
    body: {
      success: true,
      message: `${playerId} looted ${items.length} item(s) from ${targetId}.`,
      actorInventory: actor.inventory,
      targetInventory: target.inventory
    }
  };
} 