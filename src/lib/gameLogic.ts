// Types
export type RoomId = string;
export type Artifact = string;
export interface Room {
  id: string;
  description: string;
  exits: { [key: string]: string };
  artifact?: string;
  goal?: boolean;
}
export interface User {
  id: string;
  room: RoomId;
  inventory: Artifact[];
  reachedGoal: boolean;
}

// Cyberpunk world definition
const ROOMS: Record<RoomId, Room> = {
  "alley": {
    id: "alley",
    description: "A rain-soaked neon alley. The hum of distant drones fills the air.",
    exits: { east: "arcade", south: "market" },
    artifact: "Neon Katana",
  },
  "arcade": {
    id: "arcade",
    description: "A retro arcade, screens flickering with synthwave games.",
    exits: { west: "alley", south: "lobby" },
    artifact: "Quantum Key",
  },
  "market": {
    id: "market",
    description: "A bustling night market, stalls selling chrome implants.",
    exits: { north: "alley", east: "lobby" },
    artifact: "Holo Badge",
  },
  "lobby": {
    id: "lobby",
    description: "A corporate lobby, guarded by holographic sentries.",
    exits: { north: "arcade", west: "market", east: "vault" },
    artifact: "Data Shard",
  },
  "vault": {
    id: "vault",
    description: "A hidden vault, pulsing with blue light. The final challenge awaits.",
    exits: { west: "lobby" },
    artifact: "Chrome Skull",
    goal: true,
  },
};

// Required artifacts to enter the goal room
const REQUIRED_ARTIFACTS = ["Neon Katana", "Quantum Key", "Holo Badge", "Data Shard"];

// In-memory user state
let users: User[] = [];

function getOrCreateUser(userId: string): User {
  let user = users.find(u => u.id === userId);
  if (!user) {
    user = { id: userId, room: "alley", inventory: [], reachedGoal: false };
    users.push(user);
  }
  return user;
}

export function moveUser(userId: string, direction: 'north' | 'south' | 'east' | 'west') {
  const user = getOrCreateUser(userId);
  const currentRoom = ROOMS[user.room];
  const nextRoomId = currentRoom.exits[direction];
  if (!nextRoomId) return { success: false, error: "No exit that way." };
  // Check for goal room requirements
  if (ROOMS[nextRoomId].goal) {
    const hasAll = REQUIRED_ARTIFACTS.every(a => user.inventory.includes(a));
    if (!hasAll) return { success: false, error: "You need all artifacts to enter the vault!" };
    user.reachedGoal = true;
  }
  user.room = nextRoomId;
  return { success: true, room: ROOMS[user.room] };
}

export function takeArtifact(userId: string) {
  const user = getOrCreateUser(userId);
  const room = ROOMS[user.room];
  if (!room.artifact) return { success: false, error: "No artifact here." };
  if (user.inventory.includes(room.artifact)) return { success: false, error: "Already taken." };
  user.inventory.push(room.artifact);
  return { success: true, artifact: room.artifact };
}

export function getUserStatus(userId: string) {
  const user = getOrCreateUser(userId);
  return {
    id: user.id,
    room: ROOMS[user.room],
    inventory: user.inventory,
    reachedGoal: user.reachedGoal,
  };
}

export function getLeaderboard() {
  return users.map(u => ({
    id: u.id,
    inventory: u.inventory,
    reachedGoal: u.reachedGoal,
    room: u.room,
  }));
}

export function seedTestUsers() {
  users = [
    // Goal: only neo
    {
      id: 'neo',
      room: 'vault',
      inventory: ["Neon Katana", "Quantum Key", "Holo Badge", "Data Shard", "Chrome Skull"],
      reachedGoal: true,
    },
    // Lobby: 2 users with 3 artifacts
    {
      id: 'trinity',
      room: 'lobby',
      inventory: ["Neon Katana", "Quantum Key", "Data Shard"],
      reachedGoal: false,
    },
    {
      id: 'apoc',
      room: 'lobby',
      inventory: ["Neon Katana", "Quantum Key", "Data Shard"],
      reachedGoal: false,
    },
    // Market: 3 users with 2 artifacts
    {
      id: 'case',
      room: 'market',
      inventory: ["Neon Katana", "Quantum Key"],
      reachedGoal: false,
    },
    {
      id: 'cypher',
      room: 'market',
      inventory: ["Neon Katana", "Quantum Key"],
      reachedGoal: false,
    },
    {
      id: 'switch',
      room: 'market',
      inventory: ["Neon Katana", "Quantum Key"],
      reachedGoal: false,
    },
    // Arcade: 5 users with 1 artifact
    ...Array.from({ length: 5 }, (_, i) => ({
      id: `arcader${i+1}`,
      room: 'arcade',
      inventory: ["Neon Katana"],
      reachedGoal: false,
    })),
    // Alley: 20 users, no artifacts
    ...Array.from({ length: 20 }, (_, i) => ({
      id: `rookie${i+1}`,
      room: 'alley',
      inventory: [],
      reachedGoal: false,
    })),
  ];
}

export function resetGameState() {
  seedTestUsers();
}

export function getStoryMetadata() {
  // Ordered by story progression
  const roomOrder = ["alley", "arcade", "market", "lobby", "vault"];
  const artifacts = roomOrder
    .map(r => ROOMS[r].artifact)
    .filter(Boolean);
  const goalRoom = roomOrder.find(r => ROOMS[r].goal) || "vault";
  return {
    title: "Cyberpunk Maze Adventure",
    description: "Navigate the neon-lit maze, collect artifacts, and reach the vault!",
    roomOrder,
    artifacts,
    goalRoom,
    rooms: roomOrder.map(r => ROOMS[r]),
    requiredArtifacts: REQUIRED_ARTIFACTS,
  };
} 