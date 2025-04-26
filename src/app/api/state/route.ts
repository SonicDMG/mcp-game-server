import { NextRequest, NextResponse } from 'next/server';

// GET /api/state
export async function GET(req: NextRequest) {
  // Placeholder: In the future, return actual game state
  const gameState = {
    maze: [[0, 1], [1, 0]],
    mural: [[null, 'red'], ['blue', null]],
    users: [{ userId: 'user1', x: 0, y: 0 }],
  };
  return NextResponse.json(gameState);
} 