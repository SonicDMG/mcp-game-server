import { NextResponse } from 'next/server';
import { getStoryMetadata } from '../../../lib/gameLogic';

export async function GET() {
  return NextResponse.json(getStoryMetadata());
} 