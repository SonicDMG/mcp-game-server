import { NextResponse } from 'next/server';
import openapi from './openapi.json';

export async function GET() {
  return NextResponse.json(openapi, {
    headers: {
      'Cache-Control': 'no-store, max-age=0',
      'Access-Control-Allow-Origin': '*'
    }
  });
}
