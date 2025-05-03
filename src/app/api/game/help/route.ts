import { NextRequest, NextResponse } from 'next/server';
import { getPlayerState, updatePlayerState } from '../dataService';

/**
 * POST /api/game/help
 * Attempts to "help" (revive) another player in the same room.
 * Body: { playerId, targetId, storyId }
 */
export async function POST(request: NextRequest) {
  try {
    const { playerId, targetId, storyId } = await request.json();
    if (!playerId || !targetId || !storyId) {
      return NextResponse.json({ error: 'playerId, targetId, and storyId are required' }, { status: 400 });
    }
    if (playerId === targetId) {
      return NextResponse.json({ error: 'You cannot help yourself.' }, { status: 400 });
    }
    const actor = await getPlayerState(playerId, storyId);
    const target = await getPlayerState(targetId, storyId);
    if (!actor || !target) {
      return NextResponse.json({ error: 'Player(s) not found' }, { status: 404 });
    }
    if (actor.currentLocation !== target.currentLocation) {
      return NextResponse.json({ error: 'Target is not in the same room.' }, { status: 400 });
    }
    if (target.status === 'killed') {
      target.status = 'playing';
      const success = await updatePlayerState(target);
      if (!success) {
        return NextResponse.json({ error: 'Failed to update target status.' }, { status: 500 });
      }
      return NextResponse.json({ success: true, message: `${targetId} has been revived by ${playerId}.`, targetStatus: target.status });
    } else {
      return NextResponse.json({ success: false, message: `${targetId} does not need help.`, targetStatus: target.status });
    }
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to process help action' }, { status: 500 });
  }
} 