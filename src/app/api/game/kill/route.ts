import { NextRequest, NextResponse } from 'next/server';
import { getPlayerState, updatePlayerState, getStory, getLocation, getItem } from '../dataService';
import type { ItemRecord } from '../dataService';
import db from '@/lib/astradb'; // Import the initialized Db instance

/**
 * POST /api/game/kill
 * Attempts to "kill" another player in the same room.
 * Body: { playerId, targetId, storyId }
 */
export async function POST(request: NextRequest) {
  try {
    const { playerId, targetId, storyId } = await request.json();
    if (!playerId || !targetId || !storyId) {
      return NextResponse.json({ error: 'playerId, targetId, and storyId are required' }, { status: 400 });
    }
    if (playerId === targetId) {
      return NextResponse.json({ error: 'You cannot kill yourself.' }, { status: 400 });
    }
    const actor = await getPlayerState(playerId, storyId);
    const target = await getPlayerState(targetId, storyId);
    const story = await getStory(storyId);
    const location = actor ? await getLocation(actor.currentLocation, storyId) : null;
    // Get item details for both players (if any)
    const actorItems: (ItemRecord | null)[] = actor?.inventory?.length ? await Promise.all(actor.inventory.map(itemId => getItem(itemId, storyId))) : [];
    const targetItems: (ItemRecord | null)[] = target?.inventory?.length ? await Promise.all(target.inventory.map(itemId => getItem(itemId, storyId))) : [];
    // Helper to build a short, action-focused message for the event feed
    function buildKillMessage({ outcome }: { outcome: string }) {
      if (outcome === 'success') {
        return `${playerId} killed ${targetId}`;
      } else if (outcome === 'fail') {
        return `${playerId} tried to attack ${targetId} but failed`;
      } else if (outcome === 'counter') {
        return `${playerId} tried to attack ${targetId}, but ${targetId} killed ${playerId} instead`;
      }
      return '';
    }
    if (!actor || !target) {
      return NextResponse.json({ error: 'Player(s) not found' }, { status: 404 });
    }
    if (actor.currentLocation !== target.currentLocation) {
      return NextResponse.json({ error: 'Target is not in the same room.' }, { status: 400 });
    }
    if (target.status === 'killed') {
      return NextResponse.json({ error: 'Target is already killed.' }, { status: 400 });
    }
    // Add randomness to the kill attempt
    const roll = Math.random();
    // Get the events collection
    const eventsCollection = db.collection('game_events');
    if (roll < 0.6) {
      // Success: attacker kills target
      target.status = 'killed';
      const success = await updatePlayerState(target);
      if (!success) {
        return NextResponse.json({ error: 'Failed to update target status.' }, { status: 500 });
      }
      // Log event
      await eventsCollection.insertOne({
        storyId,
        type: 'kill',
        message: buildKillMessage({ outcome: 'success' }),
        actor: playerId,
        target: targetId,
        timestamp: new Date().toISOString(),
      });
      return NextResponse.json({
        success: true,
        outcome: 'success',
        message: buildKillMessage({ outcome: 'success' }),
        context: {
          theme: story?.description || story?.title || '',
          room: location ? { name: location.name, description: location.description } : null,
          actor: { id: playerId, items: actorItems?.map(i => i && i.name ? { id: i.id, name: i.name, description: i.description } : null).filter(Boolean) },
          target: { id: targetId, items: targetItems?.map(i => i && i.name ? { id: i.id, name: i.name, description: i.description } : null).filter(Boolean) }
        },
        targetStatus: target.status,
        lootableItems: target.inventory || []
      });
    } else if (roll < 0.9) {
      // Fail: attack misses
      await eventsCollection.insertOne({
        storyId,
        type: 'kill-fail',
        message: buildKillMessage({ outcome: 'fail' }),
        actor: playerId,
        target: targetId,
        timestamp: new Date().toISOString(),
      });
      return NextResponse.json({
        success: false,
        outcome: 'fail',
        message: buildKillMessage({ outcome: 'fail' }),
        context: {
          theme: story?.description || story?.title || '',
          room: location ? { name: location.name, description: location.description } : null,
          actor: { id: playerId, items: actorItems?.map(i => i && i.name ? { id: i.id, name: i.name, description: i.description } : null).filter(Boolean) },
          target: { id: targetId, items: targetItems?.map(i => i && i.name ? { id: i.id, name: i.name, description: i.description } : null).filter(Boolean) }
        },
        targetStatus: target.status
      });
    } else {
      // Counter: target kills attacker
      actor.status = 'killed';
      const success = await updatePlayerState(actor);
      if (!success) {
        return NextResponse.json({ error: 'Failed to update attacker status.' }, { status: 500 });
      }
      await eventsCollection.insertOne({
        storyId,
        type: 'counter',
        message: buildKillMessage({ outcome: 'counter' }),
        actor: playerId,
        target: targetId,
        timestamp: new Date().toISOString(),
      });
      return NextResponse.json({
        success: true,
        outcome: 'counter',
        message: buildKillMessage({ outcome: 'counter' }),
        context: {
          theme: story?.description || story?.title || '',
          room: location ? { name: location.name, description: location.description } : null,
          actor: { id: playerId, items: actorItems?.map(i => i && i.name ? { id: i.id, name: i.name, description: i.description } : null).filter(Boolean) },
          target: { id: targetId, items: targetItems?.map(i => i && i.name ? { id: i.id, name: i.name, description: i.description } : null).filter(Boolean) }
        },
        targetStatus: actor.status,
        lootableItems: actor.inventory || []
      });
    }
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to process kill action' }, { status: 500 });
  }
} 