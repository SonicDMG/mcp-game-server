// Types
export type Maze = number[][]; // 0 = path, 1 = wall
export type Mural = (string | null)[][]; // null = unpainted, string = color
export interface User {
  id: string;
  x: number;
  y: number;
  color: string;
}

// Utility to generate a random maze and mural
function generateRandomMaze(size: number): Maze {
  const maze: Maze = [];
  for (let y = 0; y < size; y++) {
    const row: number[] = [];
    for (let x = 0; x < size; x++) {
      // Border is always wall, inside is random wall or path
      if (x === 0 || y === 0 || x === size - 1 || y === size - 1) {
        row.push(1);
      } else {
        row.push(Math.random() < 0.25 ? 1 : 0); // 25% chance of wall
      }
    }
    maze.push(row);
  }
  return maze;
}

function generateEmptyMural(size: number): Mural {
  return Array.from({ length: size }, () => Array(size).fill(null));
}

function findRandomOpenPosition(maze: Maze): { x: number, y: number } {
  let x = 0, y = 0;
  const size = maze.length;
  do {
    x = Math.floor(Math.random() * size);
    y = Math.floor(Math.random() * size);
  } while (maze[y][x] !== 0);
  return { x, y };
}

// Initial state (for demo)
const GRID_SIZE = 128;
let maze: Maze = generateRandomMaze(GRID_SIZE);
let mural: Mural = generateEmptyMural(GRID_SIZE);
const startPos = findRandomOpenPosition(maze);
let users: User[] = [
  { id: 'user1', x: startPos.x, y: startPos.y, color: 'blue' },
];

// Pure functions
export function moveUser(userId: string, dx: number, dy: number) {
  const user = users.find(u => u.id === userId);
  if (!user) return false;
  const newX = user.x + dx;
  const newY = user.y + dy;
  if (
    newX < 0 || newY < 0 ||
    newY >= maze.length || newX >= maze[0].length ||
    maze[newY][newX] === 1
  ) {
    return false; // Blocked
  }
  user.x = newX;
  user.y = newY;
  return true;
}

export function paintTile(userId: string, color: string) {
  const user = users.find(u => u.id === userId);
  if (!user) return false;
  mural[user.y][user.x] = color;
  return true;
}

export function getGameState() {
  return {
    maze,
    mural,
    users,
  };
}

export function resetGameState() {
  maze = generateRandomMaze(GRID_SIZE);
  mural = generateEmptyMural(GRID_SIZE);
  const startPos = findRandomOpenPosition(maze);
  users = [
    { id: 'user1', x: startPos.x, y: startPos.y, color: 'blue' },
  ];
} 