import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');
  if (!url) {
    return new Response('Missing url parameter', { status: 400 });
  }
  try {
    const response = await fetch(url);
    if (!response.ok) {
      return new Response('Failed to fetch image', { status: 502 });
    }
    const contentType = response.headers.get('content-type') || 'image/png';
    return new Response(response.body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (_err) {
    return new Response('Error fetching image', { status: 500 });
  }
} 