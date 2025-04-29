import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Define the game command schema
const GameCommandSchema = z.object({
  action: z.enum(['move', 'examine', 'take', 'use', 'inventory', 'look']),
  target: z.string().optional(), // Location, item, or direction to interact with
  playerId: z.string(),
  with: z.string().optional(), // For combining items or using items with targets
});

type GameCommand = z.infer<typeof GameCommandSchema>;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const command = GameCommandSchema.parse(body);
    
    switch (command.action) {
      case 'move':
        if (!command.target) {
          return NextResponse.json({ 
            error: 'Please specify where you want to move to',
            hint: 'Try examining your surroundings first with the "look" command'
          }, { status: 400 });
        }
        return handleMove(command);
      
      case 'examine':
        if (!command.target) {
          return NextResponse.json({ 
            error: 'What would you like to examine?',
            hint: 'Use "look" to see what\'s around you first'
          }, { status: 400 });
        }
        return handleExamine(command);
      
      case 'take':
        if (!command.target) {
          return NextResponse.json({ 
            error: 'What would you like to take?',
            hint: 'Try examining items before taking them'
          }, { status: 400 });
        }
        return handleTake(command);

      case 'use':
        if (!command.target) {
          return NextResponse.json({ 
            error: 'What would you like to use?',
            hint: 'Check your inventory to see what items you have'
          }, { status: 400 });
        }
        return handleUse(command);

      case 'inventory':
        return handleInventory(command);

      case 'look':
        return handleLook(command);
      
      default:
        return NextResponse.json({ 
          error: 'Invalid action',
          hint: 'Available actions are: move, examine, take, use, inventory, look'
        }, { status: 400 });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Invalid command format',
        details: error.errors,
        hint: 'Try using simple commands like "look" to get started'
      }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function handleMove(command: GameCommand) {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/game/move`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      playerId: command.playerId,
      location: command.target,
    }),
  });

  const data = await response.json();
  return NextResponse.json({
    ...data,
    hint: data.success ? undefined : 'Try examining your surroundings with "look" to find valid locations'
  });
}

async function handleExamine(command: GameCommand) {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/game/examine`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      playerId: command.playerId,
      target: command.target,
    }),
  });

  const data = await response.json();
  return NextResponse.json(data);
}

async function handleTake(command: GameCommand) {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/game/take`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      playerId: command.playerId,
      item: command.target,
    }),
  });

  const data = await response.json();
  return NextResponse.json(data);
}

async function handleUse(command: GameCommand) {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/game/use`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      playerId: command.playerId,
      item: command.target,
      with: command.with,
    }),
  });

  const data = await response.json();
  return NextResponse.json(data);
}

async function handleInventory(command: GameCommand) {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/game/inventory/${command.playerId}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  const data = await response.json();
  return NextResponse.json(data);
}

async function handleLook(command: GameCommand) {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/game/look/${command.playerId}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  const data = await response.json();
  return NextResponse.json({
    ...data,
    hint: 'You can examine specific things you see for more details'
  });
} 