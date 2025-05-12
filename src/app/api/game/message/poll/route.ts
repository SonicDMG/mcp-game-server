import { NextRequest, NextResponse } from 'next/server';

// Placeholder: implement this to map user/story to storyId
async function getStoryIdForUser(userId: string, storyId: string): Promise<string> {
  // For now, just use storyId
  return storyId;
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { userId, storyId, id } = body;
  const storyDOId = await getStoryIdForUser(userId, storyId);

  // Forward poll to DO
  const pollRes = await fetch(`https://mcplayerone-do-backend.david-gilardi.workers.dev/story/${storyDOId}/poll`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  });
  const pollData = await pollRes.json();

  return NextResponse.json({
    jsonrpc: '2.0',
    id,
    ...pollData
  }, { status: 200, headers: { 'Access-Control-Allow-Origin': '*' } });
} 