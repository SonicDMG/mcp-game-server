import React from 'react';
import Image from 'next/image';
import { getProxiedImageUrl } from '../api/game/types';
import { LeaderboardUser } from '../story/[id]/Leaderboard';
import type { Location as GameLocation } from '../api/game/types';
import RoomUserList from './RoomUserList';
import dagre from 'dagre';

interface RoomGridProps {
  rooms: GameLocation[];
  users: LeaderboardUser[];
  goalRoom?: string;
  setZoomedImage: (img: string, name: string, description: string, roomId: string) => void;
  setSelectedUser: (user: LeaderboardUser) => void;
  setUserListModal: (modal: { room: string; users: LeaderboardUser[] } | null) => void;
}

const ROOM_IMAGE_PLACEHOLDER = "/images/room-placeholder.png";

const CELL_SIZE = 180;
const MAX_MAP_COLS = 3;

// Card dimensions for edge anchoring
const CARD_WIDTH = 140;
const CARD_HEIGHT = 120;

const RoomGrid: React.FC<RoomGridProps> = ({ rooms, users, goalRoom, setZoomedImage, setSelectedUser, setUserListModal }) => {
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
  const wrappedCoords: Record<string, { x: number; y: number }> = {};
  for (let i = 0; i < bfsOrder.length; i++) {
    const row = Math.floor(i / MAX_MAP_COLS);
    const colInRow = i % MAX_MAP_COLS;
    const x = row % 2 === 0 ? colInRow : (MAX_MAP_COLS - 1 - colInRow); // zig-zag: even rows L->R, odd rows R->L
    const y = row;
    wrappedCoords[bfsOrder[i]] = { x, y };
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
  // --- DAGRE graph for full layout ---
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: 'LR', nodesep: 60, ranksep: 100 });
  g.setDefaultEdgeLabel(() => ({}));
  // Add nodes (no fixed positions)
  rooms.forEach(room => {
    g.setNode(room.id, { width: CARD_WIDTH, height: CARD_HEIGHT });
  });
  // Add all edges
  rooms.forEach(room => {
    if (!room.exits) return;
    room.exits.forEach(exit => {
      g.setEdge(room.id, exit.targetLocationId);
    });
  });
  dagre.layout(g);
  // Get node positions
  const dagreNodes: Record<string, dagre.Node> = {};
  g.nodes().forEach((id: string) => {
    const node = g.node(id);
    dagreNodes[id] = node;
  });
  // Calculate bounding box for all nodes
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  Object.values(dagreNodes).forEach((node) => {
    if (!node) return;
    minX = Math.min(minX, node.x - CARD_WIDTH / 2);
    minY = Math.min(minY, node.y - CARD_HEIGHT / 2);
    maxX = Math.max(maxX, node.x + CARD_WIDTH / 2);
    maxY = Math.max(maxY, node.y + CARD_HEIGHT / 2);
  });
  const PADDING = 16;
  const LEFT_MARGIN = 4;
  const svgWidth = Math.max(0, maxX - minX) + PADDING * 2;
  const svgHeight = Math.max(0, maxY - minY) + PADDING * 2;
  // Get edge paths (only unique, source < target)
  const dagreEdges: React.ReactNode[] = [];
  const renderedPairs = new Set<string>();
  g.edges().forEach((e: dagre.Edge) => {
    // Only render one line per unique connection
    const source = String(e.v);
    const target = String(e.w);
    const pairKey = source < target ? `${source}|${target}` : `${target}|${source}`;
    if (renderedPairs.has(pairKey)) return;
    renderedPairs.add(pairKey);
    const edge = g.edge(e);
    if (edge && edge.points && edge.points.length > 1) {
      // Offset all points by -minX, -minY, +PADDING
      const offsetPoints = edge.points.map(pt => ({
        x: pt.x - minX + PADDING,
        y: pt.y - minY + PADDING,
      }));
      let d = `M${offsetPoints[0].x},${offsetPoints[0].y}`;
      for (let i = 1; i < offsetPoints.length; i++) {
        d += ` L${offsetPoints[i].x},${offsetPoints[i].y}`;
      }
      dagreEdges.push(
        <path
          key={`${source}->${target}`}
          d={d}
          stroke="#4f46e5"
          strokeWidth={3}
          fill="none"
          opacity={0.7}
        />
      );
    }
  });
  // Track non-adjacent exits for each room
  const nonAdjacentExits: Record<string, string[]> = {};
  return (
    <div style={{
      position: 'relative',
      width: svgWidth,
      height: svgHeight,
      border: '1.5px solid #23244a',
      borderRadius: 12,
      boxShadow: '0 2px 16px #23244a33',
      boxSizing: 'border-box',
    }}>
      <div style={{
        position: 'relative',
        width: svgWidth,
        height: svgHeight,
        boxSizing: 'border-box',
      }}>
        <svg
          width={svgWidth}
          height={svgHeight}
          style={{ position: 'absolute', top: 0, left: 0, zIndex: 1, pointerEvents: 'none', background: 'none' }}
        >
          {dagreEdges}
        </svg>
        {rooms.map((loc) => {
          const node = dagreNodes[loc.id];
          if (!node) return null;
          const isGoal = goalRoom && loc.id === goalRoom;
          return (
            <div
              key={loc.id}
              style={{
                position: 'absolute',
                left: node.x - CARD_WIDTH / 2 - minX + PADDING + LEFT_MARGIN,
                top: node.y - CARD_HEIGHT / 2 - minY + PADDING,
                width: CARD_WIDTH,
                border: isGoal ? '2.5px solid #ffd700' : '2px solid #333',
                boxShadow: isGoal ? '0 0 16px 2px #ffd70055' : undefined,
                borderRadius: 8,
                padding: 10,
                background: '#181c2a',
                minWidth: 140,
                minHeight: 120,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'flex-start',
                boxSizing: 'border-box',
                alignSelf: 'stretch',
                zIndex: 2,
              }}
            >
              <Image
                src={getProxiedImageUrl(loc.image || ROOM_IMAGE_PLACEHOLDER)}
                alt={loc.name}
                width={64}
                height={64}
                style={{ objectFit: 'cover', borderRadius: 4, marginBottom: 8, cursor: 'zoom-in' }}
                onClick={() => setZoomedImage(loc.image || ROOM_IMAGE_PLACEHOLDER, loc.name, loc.description, loc.id)}
                unoptimized
              />
              <div style={{ color: '#a7a7ff', fontWeight: 600, marginBottom: 4, textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 120 }}>{loc.name}</div>
              {/* Non-adjacent exit icon and tooltip */}
              {nonAdjacentExits[loc.id] && nonAdjacentExits[loc.id].length > 0 && (
                <div style={{ position: 'absolute', top: 8, right: 8, cursor: 'pointer' }} title={
                  'Non-adjacent exits to: ' + nonAdjacentExits[loc.id].map(
                    id => rooms.find(r => r.id === id)?.name || id
                  ).join(', ')
                }>
                  <span role="img" aria-label="non-adjacent exits" style={{ fontSize: 18 }}>🔗</span>
                </div>
              )}
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
  );
};

export default RoomGrid; 