import { NextRequest, NextResponse } from 'next/server';
import { getPlayerState, updatePlayerState } from '../dataService';

/**
 * POST /api/game/loot
 * Allows a player to loot items from a killed player in the same room.
 * Body: { playerId, targetId, storyId, items: [itemId, ...] }
 */
export async function POST(request: NextRequest) {
  try {
    const { playerId, targetId, storyId, items } = await request.json();
    if (!playerId || !targetId || !storyId || !Array.isArray(items)) {
      return NextResponse.json({ error: 'playerId, targetId, storyId, and items[] are required' }, { status: 400 });
    }
    if (playerId === targetId) {
      return NextResponse.json({ error: 'You cannot loot yourself.' }, { status: 400 });
    }
    const actor = await getPlayerState(playerId, storyId);
    const target = await getPlayerState(targetId, storyId);
    if (!actor || !target) {
      return NextResponse.json({ error: 'Player(s) not found' }, { status: 404 });
    }
    if (actor.currentLocation !== target.currentLocation) {
      return NextResponse.json({ error: 'Target is not in the same room.' }, { status: 400 });
    }
    if (target.status !== 'killed') {
      return NextResponse.json({ error: 'Target is not killed and cannot be looted.' }, { status: 400 });
    }
    // Validate items are in target's inventory
    const invalidItems = items.filter(item => !target.inventory.includes(item));
    if (invalidItems.length > 0) {
      return NextResponse.json({ error: `Invalid items: ${invalidItems.join(', ')}` }, { status: 400 });
    }
    // Transfer items
    target.inventory = target.inventory.filter(item => !items.includes(item));
    actor.inventory = [...actor.inventory, ...items];
    const successTarget = await updatePlayerState(target);
    const successActor = await updatePlayerState(actor);
    if (!successTarget || !successActor) {
      return NextResponse.json({ error: 'Failed to update player inventories.' }, { status: 500 });
    }
    return NextResponse.json({
      success: true,
      message: `${playerId} looted ${items.length} item(s) from ${targetId}.`,
      actorInventory: actor.inventory,
      targetInventory: target.inventory
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to process loot action' }, { status: 500 });
  }
} 