import { NextResponse } from 'next/server';
import { getGameState } from '../../../lib/gameLogic';

// GET /api/state
export async function GET() {
  return NextResponse.json(getGameState());
} 