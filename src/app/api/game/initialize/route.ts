import { NextRequest, NextResponse } from 'next/server';
import { initializeGameData } from '../dataService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { storyId } = body;

    if (!storyId) {
      return NextResponse.json(
        { error: 'storyId is required' },
        { status: 400 }
      );
    }

    const success = await initializeGameData(storyId);
    
    if (!success) {
      return NextResponse.json(
        { error: 'Failed to initialize game data' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in /api/game/initialize:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to initialize game data' },
      { status: 500 }
    );
  }
} 