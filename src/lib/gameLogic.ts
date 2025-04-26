// Types
export type Maze = number[][]; // 0 = path, 1 = wall
export type Mural = (string | null)[][]; // null = unpainted, string = color
export interface User {
  id: string;
  x: number;
  y: number;
  color: string;
}

// Initial state (for demo)
let maze: Maze = [
  [0, 1],
  [1, 0],
];
let mural: Mural = [
  [null, 'red'],
  ['blue', null],
];
let users: User[] = [
  { id: 'user1', x: 0, y: 0, color: 'blue' },
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
  maze = [
    [0, 1],
    [1, 0],
  ];
  mural = [
    [null, 'red'],
    ['blue', null],
  ];
  users = [
    { id: 'user1', x: 0, y: 0, color: 'blue' },
  ];
} 