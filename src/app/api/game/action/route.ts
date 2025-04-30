import { NextRequest, NextResponse } from 'next/server';
import { getPlayerState, updatePlayerState, getLocation, getItem } from '../dataService';

/**
 * POST /api/game/action
 * Handles generic game actions (move, examine, take, use, inventory, look) for a player.
 * Not used by the MCP tool (MCP uses more specific endpoints).
 * May be used by the frontend or for legacy/custom integrations.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { playerId, storyId, action, target } = body;

    if (!playerId || !storyId || !action) {
      return NextResponse.json(
        { error: 'playerId, storyId, and action are required' },
        { status: 400 }
      );
    }

    // Get current player state
    const playerState = await getPlayerState(playerId, storyId);
    if (!playerState) {
      return NextResponse.json(
        { error: 'Player not found' },
        { status: 404 }
      );
    }

    // Process different actions
    switch (action) {
      case 'move': {
        const location = await getLocation(target, storyId);
        if (!location) {
          return NextResponse.json(
            { error: 'Location not found' },
            { status: 404 }
          );
        }

        // Check if player can access this location
        const requirements = location.requirements || { condition: 'none' };
        if (requirements.condition !== 'none') {
          if (requirements.item && !playerState.inventory.includes(requirements.item)) {
            return NextResponse.json(
              { error: 'Required item not in inventory' },
              { status: 400 }
            );
          }
        }

        // Update player state
        playerState.currentLocation = target;
        if (!playerState.discoveredLocations.includes(target)) {
          playerState.discoveredLocations.push(target);
        }
        break;
      }

      case 'take': {
        const currentLocation = await getLocation(playerState.currentLocation, storyId);
        if (!currentLocation?.items.includes(target)) {
          return NextResponse.json(
            { error: 'Item not found in current location' },
            { status: 404 }
          );
        }

        const item = await getItem(target, storyId);
        if (!item?.canTake) {
          return NextResponse.json(
            { error: 'Item cannot be taken' },
            { status: 400 }
          );
        }

        // Add item to inventory and update location
        if (!playerState.inventory.includes(target)) {
          playerState.inventory.push(target);
        }
        if (!playerState.gameProgress.itemsFound.includes(target)) {
          playerState.gameProgress.itemsFound.push(target);
        }
        break;
      }

      case 'examine': {
        // Just return success as examining doesn't change state
        break;
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

    // Save updated player state
    const success = await updatePlayerState(playerState);
    if (!success) {
      return NextResponse.json(
        { error: 'Failed to update player state' },
        { status: 500 }
      );
    }

    return NextResponse.json(playerState);
  } catch (error) {
    console.error('Error in /api/game/action:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process action' },
      { status: 500 }
    );
  }
} 