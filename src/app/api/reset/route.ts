import { NextResponse } from 'next/server';
import { resetGameState } from '../../../lib/gameLogic';

export async function POST() {
  resetGameState();
  return NextResponse.json({ success: true });
} 