import type { PlayerState } from '../types';
import { getPlayerState, updatePlayerState } from '../dataService';

export interface HelpActionInput {
  playerId: string;
  targetId: string;
  storyId: string;
}

interface HelpHandlerServices {
  getPlayerState: (userId: string, storyId: string) => Promise<PlayerState & { _id: string } | null>;
  updatePlayerState: (player: PlayerState & { _id: string }) => Promise<boolean>;
  eventsCollection: {
    insertOne: (event: Record<string, unknown>) => Promise<unknown>;
  };
}

export async function handleHelpAction(
  { playerId, targetId, storyId }: HelpActionInput,
  services?: HelpHandlerServices
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
  if (!playerId || !targetId || !storyId) {
    return { status: 400, body: { error: 'playerId, targetId, and storyId are required' } };
  }
  if (playerId === targetId) {
    return { status: 400, body: { error: 'You cannot help yourself.' } };
  }
  const actor = await services.getPlayerState(playerId, storyId);
  const target = await services.getPlayerState(targetId, storyId);
  if (!actor || !target) {
    return { status: 404, body: { error: 'Player(s) not found' } };
  }
  if (actor.currentLocation !== target.currentLocation) {
    return { status: 400, body: { error: 'Target is not in the same room.' } };
  }
  if (target.status === 'killed') {
    target.status = 'playing';
    const success = await services.updatePlayerState(target);
    if (!success) {
      return { status: 500, body: { error: 'Failed to update target status.' } };
    }
    // Log help event
    await services.eventsCollection.insertOne({
      storyId,
      type: 'help',
      message: `${playerId} revived ${targetId}`,
      actor: playerId,
      target: targetId,
      timestamp: new Date().toISOString(),
    });
    return { status: 200, body: { success: true, storyId, userId: playerId, message: `${targetId} has been revived by ${playerId}.`, targetStatus: target.status } };
  } else {
    return { status: 200, body: { success: false, storyId, userId: playerId, message: `${targetId} does not need help.`, targetStatus: target.status } };
  }
} 