import { NextRequest, NextResponse } from 'next/server';
import { getStoryMetadata } from '../../../lib/gameLogic';

export async function GET(req: NextRequest) {
  const metadata = getStoryMetadata();
  return NextResponse.json(metadata);
} 