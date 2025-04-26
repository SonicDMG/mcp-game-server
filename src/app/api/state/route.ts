import { NextRequest, NextResponse } from 'next/server';
import { getGameState } from '../../../lib/gameLogic';

// GET /api/state
export async function GET(req: NextRequest) {
  return NextResponse.json(getGameState());
} 