import React from 'react';
import Image from 'next/image';
import { getProxiedImageUrl } from '../api/game/types';
import { LeaderboardUser } from '../AsciiLeaderboard';
import type { Location as GameLocation } from '../api/game/types';
import RoomUserList from './RoomUserList';

interface RoomGridProps {
  rooms: GameLocation[];
  users: LeaderboardUser[];
  setZoomedImage: (img: string) => void;
  setSelectedUser: (user: LeaderboardUser) => void;
  setUserListModal: (modal: { room: string; users: LeaderboardUser[] } | null) => void;
}

const ROOM_IMAGE_PLACEHOLDER = "/images/room-placeholder.png";

const CELL_SIZE = 180;
const MAX_MAP_COLS = 3;

const RoomGrid: React.FC<RoomGridProps> = ({ rooms, users, setZoomedImage, setSelectedUser, setUserListModal }) => {
  // Step 2: Remap coordinates to fit within MAX_MAP_COLS columns
  const rootId = rooms[0]?.id;
  const visited = new Set();
  const bfsOrder: string[] = [];
  if (rootId) {
    const queue = [rootId];
    while (queue.length) {
      const id = queue.shift();
      if (!id || visited.has(id)) continue;
      visited.add(id);
      bfsOrder.push(id);
      const loc = rooms.find(r => r.id === id);
      if (loc && loc.exits) {
        for (const exit of loc.exits) {
          if (!visited.has(exit.targetLocationId)) {
            queue.push(exit.targetLocationId);
          }
        }
      }
    }
  }
  let curX = 0, curY = 0;
  const wrappedCoords: Record<string, { x: number; y: number }> = {};
  for (const id of bfsOrder) {
    wrappedCoords[id] = { x: curX, y: curY };
    curX++;
    if (curX >= MAX_MAP_COLS) {
      curX = 0;
      curY++;
    }
  }
  const totalRooms = bfsOrder.length;
  const mapRows = Math.ceil(totalRooms / MAX_MAP_COLS);
  const grid = Array.from({ length: mapRows }, () => Array(MAX_MAP_COLS).fill(null));
  bfsOrder.forEach((id) => {
    const { x, y } = wrappedCoords[id];
    const loc = rooms.find(r => r.id === id);
    if (loc) grid[y][x] = loc;
  });
  const roomCenters: Record<string, { cx: number; cy: number }> = {};
  Object.entries(wrappedCoords).forEach(([id, { x, y }]) => {
    roomCenters[id] = {
      cx: x * CELL_SIZE + CELL_SIZE / 2,
      cy: y * CELL_SIZE + CELL_SIZE / 2,
    };
  });
  const svgLines: React.ReactNode[] = [];
  rooms.forEach(room => {
    if (!wrappedCoords[room.id] || !room.exits) return;
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
  return (
    <div style={{
      position: 'relative',
      width: 'fit-content',
      minWidth: '100%',
      margin: '0 auto',
      overflowX: 'hidden',
      overflowY: 'hidden',
      background: 'none',
    }}>
      <div style={{
        position: 'relative',
        width: MAX_MAP_COLS * CELL_SIZE,
        height: mapRows * CELL_SIZE,
        margin: '0 auto',
      }}>
        <svg width={MAX_MAP_COLS * CELL_SIZE} height={mapRows * CELL_SIZE} style={{ position: 'absolute', top: 0, left: 0, zIndex: 1, pointerEvents: 'none' }}>
          {svgLines}
        </svg>
        <div style={{ display: 'grid', gridTemplateRows: `repeat(${mapRows}, ${CELL_SIZE}px)`, gridTemplateColumns: `repeat(${MAX_MAP_COLS}, ${CELL_SIZE}px)`, gap: '16px', justifyItems: 'center', alignItems: 'center', position: 'relative', zIndex: 2 }}>
          {grid.flat().map((loc) => {
            if (!loc) return <div key={`empty-${loc}`} />;
            return (
              <div key={loc.id} style={{ border: '2px solid #333', borderRadius: 8, padding: 10, background: '#181c2a', minWidth: 140, minHeight: 120, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start' }}>
                <Image
                  src={getProxiedImageUrl(loc.image || ROOM_IMAGE_PLACEHOLDER)}
                  alt={loc.name}
                  width={64}
                  height={64}
                  style={{ objectFit: 'cover', borderRadius: 4, marginBottom: 8, cursor: 'zoom-in' }}
                  onClick={() => setZoomedImage(loc.image || ROOM_IMAGE_PLACEHOLDER)}
                  unoptimized
                />
                <div style={{ color: '#a7a7ff', fontWeight: 600, marginBottom: 4, textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 120 }}>{loc.name}</div>
                <div style={{ fontSize: 12, color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, width: '100%' }}>
                  <RoomUserList
                    users={users.filter(u => u.room === loc.id)}
                    loc={loc}
                    setSelectedUser={setSelectedUser}
                    setUserListModal={setUserListModal}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default RoomGrid; 