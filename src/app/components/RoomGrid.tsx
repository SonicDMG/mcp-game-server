import React, { useRef, useEffect, useState, forwardRef, useImperativeHandle, useMemo } from 'react';
import Image from 'next/image';
import { getProxiedImageUrl } from '../api/game/types';
import { LeaderboardUser } from './Leaderboard';
import type { Location as GameLocation } from '../api/game/types';
import RoomUserList from './RoomUserList';
import dagre from 'dagre';
import styles from './RoomGrid.module.css';

interface RoomGridProps {
  rooms: GameLocation[];
  users: LeaderboardUser[];
  goalRoom?: string;
  setZoomedImage: (img: string, name: string, description: string, roomId: string) => void;
  setSelectedUser: (user: LeaderboardUser) => void;
  setUserListModal: (modal: { room: string; users: LeaderboardUser[] } | null) => void;
  rankdir?: 'LR' | 'TB';
  nodesep?: number;
  ranksep?: number;
  onSaveLayout?: () => void;
  onResetLayout?: () => void;
  storyId: string;
  setRankdir?: (v: 'LR' | 'TB') => void;
  setNodesep?: (v: number) => void;
  setRanksep?: (v: number) => void;
}

const ROOM_IMAGE_PLACEHOLDER = "/images/room-placeholder.png";

const CELL_SIZE = 180;
const MAX_MAP_COLS = 3;

// Card dimensions for edge anchoring
const CARD_WIDTH = 140;
const CARD_HEIGHT = 120;

const RoomGrid = forwardRef<
  { saveLayout: () => void; resetLayout: () => void },
  RoomGridProps
>(({
  rooms, users, goalRoom, setZoomedImage, setSelectedUser, setUserListModal, rankdir = 'LR', nodesep = 60, ranksep = 100, onSaveLayout, onResetLayout, storyId, setRankdir, setNodesep, setRanksep
}, ref) => {
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

  // Memoized dagre layout and node positions
  const layout = useMemo(() => {
    // --- DAGRE graph for full layout ---
    const g = new dagre.graphlib.Graph();
    g.setGraph({ rankdir, nodesep, ranksep });
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
    // Always use dagre's output for node positions
    const nodePositions: Record<string, { x: number; y: number }> = {};
    rooms.forEach(room => {
      const node = dagreNodes[room.id];
      if (node) nodePositions[room.id] = { x: node.x, y: node.y };
    });
    // Calculate bounding box for all nodes
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    Object.values(nodePositions).forEach((pos) => {
      if (!pos) return;
      minX = Math.min(minX, pos.x - CARD_WIDTH / 2);
      minY = Math.min(minY, pos.y - CARD_HEIGHT / 2);
      maxX = Math.max(maxX, pos.x + CARD_WIDTH / 2);
      maxY = Math.max(maxY, pos.y + CARD_HEIGHT / 2);
    });
    // Get edge paths (only unique, source < target)
    const PADDING = 16;
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
    return { dagreNodes, nodePositions, minX, minY, maxX, maxY, dagreEdges };
  }, [rooms, rankdir, nodesep, ranksep]);

  const { dagreNodes, nodePositions, minX, minY, maxX, maxY, dagreEdges } = layout;
  const PADDING = 16;
  const LEFT_MARGIN = 4;
  const svgWidth = Math.max(0, maxX - minX) + PADDING * 2;
  const svgHeight = Math.max(0, maxY - minY) + PADDING * 2;

  // Responsive scaling logic
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useEffect(() => {
    function handleResize() {
      if (containerRef.current) {
        const parentWidth = containerRef.current.offsetWidth;
        const parentHeight = containerRef.current.offsetHeight || window.innerHeight * 0.6;
        const widthScale = parentWidth / svgWidth;
        const heightScale = parentHeight / svgHeight;
        setScale(Math.min(widthScale, heightScale, 1));
      }
    }
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [svgWidth, svgHeight]);

  // Track non-adjacent exits for each room
  const nonAdjacentExits: Record<string, string[]> = {};

  // Fetch saved layout on mount
  useEffect(() => {
    if (!storyId) return;
    fetch(`/api/game/room-positions?storyId=${storyId}`)
      .then(res => res.json())
      .then(data => {
        if (data && data.positions) {
          // Set initial slider states from saved layout
          if (data.rankdir && setRankdir) setRankdir(data.rankdir);
          if (typeof data.nodesep === 'number' && setNodesep) setNodesep(data.nodesep);
          if (typeof data.ranksep === 'number' && setRanksep) setRanksep(data.ranksep);
          // Optionally: could animate from these positions, but for now, don't use them after load
        }
        // After initial load, clear savedPositions so dagre is always used
      });
  }, [storyId, setRankdir, setNodesep, setRanksep]);

  // Save Layout handler
  const saveLayout = async () => {
    // Save current node positions and settings
    const positions: Record<string, { x: number; y: number }> = {};
    rooms.forEach(room => {
      const node = dagreNodes[room.id];
      if (node) positions[room.id] = { x: node.x, y: node.y };
    });
    await fetch('/api/game/room-positions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        storyId,
        positions,
        rankdir,
        nodesep,
        ranksep,
      }),
    });
    if (onSaveLayout) onSaveLayout();
  };
  // Reset Layout handler
  const resetLayout = async () => {
    await fetch('/api/game/room-positions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        storyId,
        positions: {},
        rankdir: null,
        nodesep: null,
        ranksep: null,
      }),
    });
    if (onResetLayout) onResetLayout();
  };

  useImperativeHandle(ref, () => ({
    saveLayout,
    resetLayout,
  }));

  return (
    <div ref={containerRef} className={styles.roomGridContainer}>
      <div
        style={{
          width: svgWidth,
          height: svgHeight,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          position: 'relative',
        }}
      >
        <svg
          width={svgWidth}
          height={svgHeight}
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          style={{ position: 'absolute', top: 0, left: 0, zIndex: 1, pointerEvents: 'none', background: 'none' }}
        >
          {dagreEdges}
        </svg>
        {rooms.map((loc) => {
          const pos = nodePositions[loc.id];
          if (!pos) return null;
          const isGoal = goalRoom && loc.id === goalRoom;
          return (
            <div
              key={loc.id}
              style={{
                position: 'absolute',
                left: pos.x - CARD_WIDTH / 2 - minX + PADDING + LEFT_MARGIN,
                top: pos.y - CARD_HEIGHT / 2 - minY + PADDING,
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
                style={{ objectFit: 'cover', borderRadius: 4, marginBottom: 8, cursor: 'zoom-in', width: 64, height: 'auto' }}
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
});
RoomGrid.displayName = "RoomGrid";

export default RoomGrid; 