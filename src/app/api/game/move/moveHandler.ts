import { PlayerState, Location, Story } from '../types';
// REMOVE: import db from '@/lib/astradb';

interface MoveActionInput {
  userId: string;
  target: string;
  storyId: string;
}

interface MoveHandlerServices {
  playersCollection: {
    findOne: (query: Record<string, unknown>) => Promise<(PlayerState & { _id: string }) | null>;
    updateOne: (filter: Record<string, unknown>, update: Record<string, unknown>) => Promise<unknown>;
  };
  locationsCollection: {
    findOne: (query: Record<string, unknown>) => Promise<(Location & { _id: string }) | null>;
    updateOne?: (filter: Record<string, unknown>, update: Record<string, unknown>) => Promise<unknown>;
  };
  storiesCollection: {
    findOne: (query: Record<string, unknown>) => Promise<(Story & { _id: string; goalRoomId?: string; requiredArtifacts?: string[] }) | null>;
  };
  eventsCollection: {
    insertOne: (event: Record<string, unknown>) => Promise<unknown>;
  };
}

export async function handleMoveAction(
  { userId, target: targetLocationId, storyId }: MoveActionInput,
  services?: MoveHandlerServices
) {
  if (!services) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const db = require('@/lib/astradb').default;
    services = {
      playersCollection: db.collection('game_players'),
      locationsCollection: db.collection('game_locations'),
      storiesCollection: db.collection('game_stories'),
      eventsCollection: db.collection('game_events'),
    };
  }
  // At this point, services is always defined
  services = services!;
  if (!userId || !targetLocationId || !storyId) {
    return { status: 400, body: {
      success: false,
      error: 'User ID, target location ID, and Story ID are required',
      hint: 'Specify where you want to move and in which story'
    }};
  }
  const playerDocId = `${storyId}_${userId}`;
  const player = await services.playersCollection.findOne({ _id: playerDocId });
  if (!player) {
    return { status: 200, body: { success: false, needsPlayer: true, error: 'Player not found. Please start the game first.', hint: 'Call /api/game/start to create a new player.' } };
  }
  if (player.storyId !== storyId) {
    return { status: 400, body: { success: false, error: 'Player story mismatch.' } };
  }
  const currentLocation = await services.locationsCollection.findOne({ id: player.currentLocation, storyId: storyId });
  if (!currentLocation) {
    return { status: 500, body: { success: false, error: 'Internal error: Current location data missing' } };
  }
  const destinationLocation = await services.locationsCollection.findOne({ id: targetLocationId, storyId: storyId });
  if (!destinationLocation) {
    return { status: 404, body: { success: false, error: `Location "${targetLocationId}" does not exist in this story.` } };
  }
  const isValidExit = currentLocation.exits?.some((exit: { direction: string; targetLocationId: string; description?: string }) => exit.targetLocationId === targetLocationId);
  if (!isValidExit) {
    return { status: 200, body: { success: false, message: `You cannot move to "${targetLocationId}" from here.` } };
  }
  if (destinationLocation.requirements) {
    if (destinationLocation.requirements.item && !player.inventory.includes(destinationLocation.requirements.item)) {
      return { status: 200, body: {
        success: false,
        message: `You cannot enter the ${destinationLocation.name} yet.`,
        hint: `You might need the ${destinationLocation.requirements.item}.`
      }};
    }
    if (destinationLocation.requirements.condition && destinationLocation.requirements.condition !== 'none') {
      const requiredPuzzle = `puzzle_for_${destinationLocation.requirements.condition}`;
      if (!player.gameProgress.puzzlesSolved.includes(requiredPuzzle)) {
        return { status: 200, body: {
          success: false,
          message: `You sense a mechanism preventing entry to the ${destinationLocation.name}.`,
          hint: `Perhaps something needs to be solved or activated first.`
        }};
      }
    }
  }
  // Update player state
  const playerUpdatePayload = {
    $set: { currentLocation: targetLocationId },
    $addToSet: { discoveredLocations: targetLocationId }
  };
  await services.playersCollection.updateOne({ _id: player._id }, playerUpdatePayload);
  // Re-fetch the player after updating location
  const updatedPlayer = await services.playersCollection.findOne({ _id: player._id });
  if (!updatedPlayer) {
    return { status: 500, body: { success: false, error: 'Internal error: Player state missing after update' } };
  }
  // Win condition check
  const story = await services.storiesCollection.findOne({ id: storyId });
  if (story && story.goalRoomId && story.requiredArtifacts) {
    const inGoalRoom = targetLocationId === story.goalRoomId;
    const hasAllArtifacts = story.requiredArtifacts.every((artifactId: string) => updatedPlayer.inventory.includes(artifactId));
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
          location: destinationLocation,
          message: 'Congratulations! You have collected all required artifacts and reached the goal. You win!',
          win: true
        }
      };
    }
  }
  return {
    status: 200,
    body: {
      success: true,
      storyId,
      userId,
      location: destinationLocation,
      message: `You move to the ${destinationLocation.name}.\n${destinationLocation.description}`,
      hint: destinationLocation.items && destinationLocation.items.length > 0 ? 'You notice some items here.' : 'Remember to look around.'
    }
  };
} 