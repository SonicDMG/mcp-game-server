import { getPlayerState, updatePlayerState } from '../../../dataService';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  context: any // Use any temporarily to bypass build error
) {
  try {
    // Manually extract params, assuming context has params property
    const { storyId, playerId } = context?.params || {}; 
    if (!storyId || !playerId) {
        console.error('Missing storyId or playerId in context params', context);
        return NextResponse.json({ error: 'Invalid route parameters' }, { status: 400 });
    }
    const playerState = await getPlayerState(playerId, storyId);
    
    if (!playerState) {
      return NextResponse.json(
        { success: false, needsPlayer: true, error: 'Player not found. Please start the game first.', hint: 'Call /api/game/start to create a new player.' },
        { status: 200 }
      );
    }

    return NextResponse.json(playerState);
  } catch (error) {
    console.error('Error in /api/game/state:', error);
    return NextResponse.json(
      { error: 'Failed to get player state' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest
  // Remove unused context parameter
  // context: { params: GameStateParams }
) {
  try {
    // Destructure params from the context object - no longer needed
    // const { storyId: _storyId, playerId: _playerId } = context.params; 
    const body = await request.json();
    const { playerState } = body;

    if (!playerState) {
      return NextResponse.json(
        { error: 'Player state is required' },
        { status: 400 }
      );
    }

    const success = await updatePlayerState(playerState);
    if (!success) {
      return NextResponse.json(
        { error: 'Failed to update player state' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in /api/game/state:', error);
    return NextResponse.json(
      { error: 'Failed to update player state' },
      { status: 500 }
    );
  }
} 