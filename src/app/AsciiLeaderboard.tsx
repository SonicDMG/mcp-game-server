import React, { useState } from 'react';
import Image from 'next/image';
import { getProxiedImageUrl } from './api/game/types';
import UserDetailCard from './UserDetailCard';
import { Location as GameLocation } from '@/app/api/game/types';
import type { Location } from './api/game/types';

interface LeaderboardUser {
  id: string;
  inventory: string[];
  reachedGoal: boolean;
  room: string;
  isWinner?: boolean;
}

interface StoryMetadata {
  title: string;
  description: string;
  roomOrder: string[];
  artifacts: string[];
  goalRoom: string;
  rooms: GameLocation[];
  requiredArtifacts: string[];
}

interface AsciiLeaderboardProps {
  story: StoryMetadata;
  users: LeaderboardUser[];
}

const avatarUrl = (userId: string) =>
  `https://api.dicebear.com/7.x/pixel-art/png?seed=${encodeURIComponent(userId)}`;

const color = {
  heading: '#3b82f6',
  room: '#a78bfa',
  user: '#06b6d4',
  artifact: '#fff',
  winner: '#fbbf24',
  sparkle: '#fef08a',
};

const ROOM_IMAGE_PLACEHOLDER = "/images/room-placeholder.png"; // Place this image in your public/images/ directory or use a remote URL

const WinnerCrown = () => (
  <span style={{ color: color.winner, marginRight: 4, fontSize: '1.2em' }}>👑</span>
);

const Sparkle = ({ delay = 0 }) => (
  <span 
    style={{ 
      color: color.sparkle,
      animation: `sparkle 1s ease-in-out infinite`,
      animationDelay: `${delay}s`,
      display: 'inline-block'
    }}
  >
    ✦
  </span>
);

const WinnerSparkles = () => (
  <span style={{ marginLeft: '8px' }}>
    <Sparkle delay={0} />
    <Sparkle delay={0.2} />
    <Sparkle delay={0.4} />
  </span>
);

type RoomCoord = { x: number; y: number };

function inferRoomCoordinates(locations: Location[]): Record<string, RoomCoord> {
  if (!locations || locations.length === 0) return {};
  const locMap: Record<string, Location> = Object.fromEntries(locations.map((l: Location) => [l.id, l]));
  const coords: Record<string, RoomCoord> = {};
  const visited = new Set<string>();
  // Pick the first location as the root (could use startingLocation if available)
  const rootId = locations[0].id;
  const queue: Array<{ id: string; x: number; y: number }> = [{ id: rootId, x: 0, y: 0 }];
  coords[rootId] = { x: 0, y: 0 };
  visited.add(rootId);
  const dirMap: Record<string, [number, number]> = { north: [0, -1], south: [0, 1], east: [1, 0], west: [-1, 0] };
  while (queue.length) {
    const { id, x, y } = queue.shift()!;
    const loc = locMap[id];
    if (!loc || !loc.exits) continue;
    for (const exit of loc.exits) {
      const targetId = exit.targetLocationId;
      if (!visited.has(targetId)) {
        // Try to infer direction from exit description or direction field
        const dir = exit.direction?.toLowerCase() || '';
        const [dx, dy] = dirMap[dir] || [1, 0]; // Default: right
        const nx = x + dx;
        const ny = y + dy;
        coords[targetId] = { x: nx, y: ny };
        queue.push({ id: targetId, x: nx, y: ny });
        visited.add(targetId);
      }
    }
  }
  return coords;
}

export default function AsciiLeaderboard({ story, users }: AsciiLeaderboardProps) {
  const [selectedUser, setSelectedUser] = useState<LeaderboardUser | null>(null);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [userListModal, setUserListModal] = useState<{ room: string; users: LeaderboardUser[] } | null>(null);
  // console.log('[AsciiLeaderboard Render] selectedUser:', selectedUser);

  const handleUserClick = (user: LeaderboardUser) => {
    // console.log('[AsciiLeaderboard] handleUserClick called for user:', user);
    setSelectedUser(user);
  };

  const handleCloseCard = () => {
    // console.log('[AsciiLeaderboard] handleCloseCard called.');
    setSelectedUser(null);
  };

  // Build ASCII art string and avatar map
  const asciiRows: React.ReactNode[] = [];
  asciiRows.push(
    <div key="title" style={{ color: color.heading, fontWeight: 700, fontSize: '1.3rem', marginBottom: 8, textAlign: 'center' }}>
      {story.title} <span style={{ color: color.room }}>[Adventure]</span>
    </div>
  );

  // Find winners (users who have reached the goal)
  const winners = users.filter(u => u.reachedGoal);
  if (winners.length > 0) {
    asciiRows.push(
      <div key="winners" style={{ 
        textAlign: 'center', 
        margin: '16px 0', 
        padding: '12px',
        background: 'rgba(251, 191, 36, 0.1)',
        borderRadius: '8px',
        border: '1px solid rgba(251, 191, 36, 0.2)'
      }}>
        <div style={{ color: color.winner, fontWeight: 700, fontSize: '1.2rem', marginBottom: 8 }}>
          <WinnerSparkles /> WINNER{winners.length > 1 ? 'S' : ''} <WinnerSparkles />
        </div>
        {winners.map((winner, _i) => (
          <div key={winner.id + '-' + _i} style={{ 
            display: 'inline-flex', 
            alignItems: 'center',
            margin: '4px 12px',
            padding: '4px 12px',
            background: 'rgba(251, 191, 36, 0.15)',
            borderRadius: '4px'
          }}>
            <WinnerCrown />
            <Image 
              src={getProxiedImageUrl(avatarUrl(winner.id))} 
              alt="avatar" 
              width={32} 
              height={32} 
              style={{ borderRadius: 4, marginRight: 8, background: '#222' }} 
            />
            <span style={{ 
              color: color.winner,
              fontWeight: 700,
              cursor: 'pointer',
              textDecoration: 'underline',
              textDecorationStyle: 'dotted',
              textDecorationColor: 'rgba(251, 191, 36, 0.4)',
            }}
              onClick={() => handleUserClick(winner)}
            >
              {winner.id}
            </span>
            {winner.isWinner && <WinnerSparkles />}
          </div>
        ))}
      </div>
    );
  }

  // Infer coordinates for rooms
  const roomCoords = inferRoomCoordinates(story.rooms);
  // Find grid bounds
  const xs = Object.values(roomCoords).map((c: RoomCoord) => c.x);
  const ys = Object.values(roomCoords).map((c: RoomCoord) => c.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const maxX = Math.max(...xs);
  const maxY = Math.max(...ys);
  const gridRows = maxY - minY + 1;
  const gridCols = maxX - minX + 1;

  // Map roomId to location data
  const locById = Object.fromEntries(story.rooms.map(l => [l.id, l]));

  // Build a 2D array for grid rendering
  const grid = Array.from({ length: gridRows }, () => Array(gridCols).fill(null));
  Object.entries(roomCoords).forEach(([id, { x, y }]) => {
    grid[y - minY][x - minX] = locById[id];
  });

  // Render the grid with SVG connections
  // --- SVG Connection Logic ---
  // Map roomId to grid cell pixel center
  const CELL_SIZE = 180; // px, including gap
  const roomCenters: Record<string, { cx: number; cy: number }> = {};
  Object.entries(roomCoords).forEach(([id, { x, y }]) => {
    roomCenters[id] = {
      cx: (x - minX) * CELL_SIZE + CELL_SIZE / 2,
      cy: (y - minY) * CELL_SIZE + CELL_SIZE / 2,
    };
  });
  // Build SVG lines for each exit
  const svgLines: React.ReactNode[] = [];
  story.rooms.forEach(room => {
    if (!roomCoords[room.id] || !room.exits) return;
    room.exits.forEach(exit => {
      const target = exit.targetLocationId;
      if (roomCenters[room.id] && roomCenters[target]) {
        svgLines.push(
          <line
            key={`${room.id}->${target}`}
            x1={roomCenters[room.id].cx}
            y1={roomCenters[room.id].cy}
            x2={roomCenters[target].cx}
            y2={roomCenters[target].cy}
            stroke="#4f46e5"
            strokeWidth={4}
            strokeLinecap="round"
            opacity={0.5}
          />
        );
      }
    });
  });

  asciiRows.push(
    <div style={{ position: 'relative', width: gridCols * CELL_SIZE, height: gridRows * CELL_SIZE, margin: '2rem auto' }}>
      <svg width={gridCols * CELL_SIZE} height={gridRows * CELL_SIZE} style={{ position: 'absolute', top: 0, left: 0, zIndex: 1, pointerEvents: 'none' }}>
        {svgLines}
      </svg>
      <div style={{ display: 'grid', gridTemplateRows: `repeat(${gridRows}, ${CELL_SIZE}px)`, gridTemplateColumns: `repeat(${gridCols}, ${CELL_SIZE}px)`, gap: '16px', justifyItems: 'center', alignItems: 'center', position: 'relative', zIndex: 2 }}>
        {grid.flat().map((loc, idx) => {
          const rowIdx = Math.floor(idx / gridCols);
          const colIdx = idx % gridCols;
          return loc ? (
            <div key={loc.id} style={{ border: '2px solid #333', borderRadius: 8, padding: 8, background: '#181c2a', minWidth: 120, minHeight: 120, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <Image
                src={getProxiedImageUrl(loc.image || ROOM_IMAGE_PLACEHOLDER)}
                alt={loc.name}
                width={64}
                height={64}
                style={{ objectFit: 'cover', borderRadius: 4, marginBottom: 8, cursor: 'zoom-in' }}
                onClick={() => setZoomedImage(loc.image || ROOM_IMAGE_PLACEHOLDER)}
                unoptimized
              />
              <div style={{ color: '#a7a7ff', fontWeight: 600, marginBottom: 4 }}>{loc.name}</div>
              {/* Render users in this room, if any */}
              <div style={{ fontSize: 12, color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                {(() => {
                  const roomUsers = users.filter(u => u.room === loc.id);
                  if (roomUsers.length === 0) return <span style={{ color: '#888' }}>(no users)</span>;
                  const maxToShow = 3;
                  const shown = roomUsers.slice(0, maxToShow);
                  const overflow = roomUsers.length - maxToShow;
                  return <>
                    {shown.map((user, _i) => (
                      <span key={user.id + '-' + _i} style={{ display: 'flex', alignItems: 'center', marginBottom: 2 }}>
                        <Image
                          src={getProxiedImageUrl(avatarUrl(user.id))}
                          alt="avatar"
                          width={20}
                          height={20}
                          style={{ borderRadius: 4, marginRight: 4, background: '#222', cursor: 'pointer' }}
                          onClick={() => setSelectedUser(user)}
                          unoptimized
                        />
                        <span
                          style={{
                            color: color.user,
                            fontWeight: 600,
                            cursor: 'pointer',
                            textDecoration: 'underline',
                            textDecorationStyle: 'dotted',
                            textDecorationColor: 'rgba(59, 130, 246, 0.4)',
                            marginRight: 4,
                          }}
                          onClick={() => setSelectedUser(user)}
                        >
                          {user.id}
                        </span>
                        <span style={{ color: color.artifact, marginLeft: 2, fontWeight: 400 }}>
                          ({user.inventory.length} Artifact{user.inventory.length === 1 ? '' : 's'})
                        </span>
                      </span>
                    ))}
                    {overflow > 0 && (
                      <span
                        key={`overflow-${loc.id}`}
                        style={{ color: '#a7a7ff', cursor: 'pointer', fontWeight: 600, marginTop: 2 }}
                        onClick={() => setUserListModal({ room: loc.name, users: roomUsers })}
                      >
                        +{overflow} more
                      </span>
                    )}
                  </>;
                })()}
              </div>
            </div>
          ) : <div key={`empty-${rowIdx}-${colIdx}`} />;
        })}
      </div>
    </div>
  );

  return (
    <>
      <div style={{ fontFamily: 'monospace', background: 'none', color: '#fff', width: '100%', maxWidth: 900, margin: '0 auto', padding: 12 }}>
        {asciiRows}
      </div>
      {selectedUser && (
        <UserDetailCard
          user={selectedUser}
          story={story}
          onClose={handleCloseCard}
        />
      )}
      {zoomedImage && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0,0,0,0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setZoomedImage(null)}
        >
          <div
            style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }}
            onClick={e => e.stopPropagation()}
          >
            <Image
              src={getProxiedImageUrl(zoomedImage)}
              alt="Zoomed Room"
              width={600}
              height={400}
              style={{
                maxWidth: '90vw',
                maxHeight: '80vh',
                borderRadius: 12,
                objectFit: 'contain',
                boxShadow: '0 8px 32px #000a',
                background: '#222',
              }}
            />
            <button
              onClick={() => setZoomedImage(null)}
              style={{
                position: 'absolute',
                top: 8,
                right: 8,
                background: 'rgba(0,0,0,0.7)',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                padding: '6px 12px',
                fontSize: 18,
                cursor: 'pointer',
                zIndex: 1001,
              }}
            >
              ✕
            </button>
          </div>
        </div>
      )}
      {userListModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
          }}
          onClick={() => setUserListModal(null)}
        >
          <div
            style={{ background: '#222', borderRadius: 12, padding: 24, minWidth: 320, maxWidth: 400, maxHeight: '80vh', overflowY: 'auto', boxShadow: '0 8px 32px #000a', position: 'relative' }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ color: color.heading, marginBottom: 12, textAlign: 'center' }}>Users in {userListModal.room}</h3>
            {userListModal.users.map((user, _i) => (
              <div key={user.id + '-' + _i} style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                <Image
                  src={getProxiedImageUrl(avatarUrl(user.id))}
                  alt="avatar"
                  width={24}
                  height={24}
                  style={{ borderRadius: 4, marginRight: 8, background: '#222', cursor: 'pointer' }}
                  onClick={() => setSelectedUser(user)}
                  unoptimized
                />
                <span
                  style={{
                    color: color.user,
                    fontWeight: 600,
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    textDecorationStyle: 'dotted',
                    textDecorationColor: 'rgba(59, 130, 246, 0.4)',
                    marginRight: 4,
                  }}
                  onClick={() => setSelectedUser(user)}
                >
                  {user.id}
                </span>
                <span style={{ color: color.artifact, marginLeft: 2, fontWeight: 400 }}>
                  ({user.inventory.length} Artifact{user.inventory.length === 1 ? '' : 's'})
                </span>
              </div>
            ))}
            <button
              onClick={() => setUserListModal(null)}
              style={{
                position: 'absolute',
                top: 8,
                right: 8,
                background: 'rgba(0,0,0,0.7)',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                padding: '6px 12px',
                fontSize: 18,
                cursor: 'pointer',
                zIndex: 1001,
              }}
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </>
  );
} 