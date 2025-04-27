import React, { useEffect, useRef, useState } from 'react';
import type { Room } from '../lib/gameLogic';
import { motion } from 'framer-motion';

interface LeaderboardUser {
  id: string;
  inventory: string[];
  reachedGoal: boolean;
  room: string;
}

interface StoryMetadata {
  title: string;
  description: string;
  roomOrder: string[];
  artifacts: string[];
  goalRoom: string;
  rooms: Room[];
  requiredArtifacts: string[];
}

interface BracketFlowProps {
  story: StoryMetadata;
  users: LeaderboardUser[];
}

export default function BracketFlow({ story, users }: BracketFlowProps) {
  // Enforce a maximum of 5 rooms
  const maxRooms = 5;
  let rooms = story.roomOrder.slice(0, maxRooms);
  rooms = rooms.reverse(); // Goal room first, start room last
  const totalSteps = rooms.length;

  // Responsive user card component with framer-motion
  const MIN_CARD_WIDTH = 80;
  const CARD_GAP = 8;

  const UserCard = ({ user }: { user: LeaderboardUser }) => {
    return (
      <motion.div
        className="bracket-user-card-portrait"
        whileHover={{ y: -18, scale: 1.08, zIndex: 100 }}
        whileTap={{ scale: 1.04, zIndex: 200 }}
        drag={false}
      >
        <img
          className="bracket-user-avatar"
          src="https://api.dicebear.com/7.x/pixel-art/svg?seed=placeholder"
          alt="avatar"
        />
        {user.id}
        <div className="bracket-user-card-artifacts">
          {user.inventory.length} Artifacts
        </div>
      </motion.div>
    );
  };

  // --- Bracket row layout logic ---
  const [containerWidth, setContainerWidth] = useState(1200);
  const rowRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    function updateWidths() {
      if (rowRefs.current.length > 0) {
        const w = rowRefs.current[0]?.offsetWidth || 1200;
        setContainerWidth(w);
      }
    }
    updateWidths();
    window.addEventListener('resize', updateWidths);
    return () => window.removeEventListener('resize', updateWidths);
  }, []);

  // Move rows definition here, after useEffect and state
  const rows = rooms.map((room, idx) => {
    const stepIdx = idx;
    const usersAtStep = users.filter(u => {
      const artifactCount = Math.min(u.inventory.length, maxRooms - 1);
      return (u.reachedGoal ? 0 : totalSteps - 1 - artifactCount) === stepIdx;
    });
    const n = usersAtStep.length;
    // How many cards fit at min width + gap?
    const fitCount = Math.floor((containerWidth + CARD_GAP) / (MIN_CARD_WIDTH + CARD_GAP));
    let overlap = 0;
    let wrap = false;
    // Always left-align and use a fixed gap
    const justifyContent: React.CSSProperties['justifyContent'] = 'flex-start';
    if (n > fitCount) {
      // Calculate overlap so at least 50% of each card is visible
      const visibleWidth = containerWidth / n;
      if (visibleWidth < MIN_CARD_WIDTH / 2) {
        wrap = true;
        overlap = 0;
      } else {
        overlap = ((containerWidth - n * MIN_CARD_WIDTH) / (n - 1)) - CARD_GAP;
      }
    }
    return (
      <div key={room} className="bracket-row">
        <div className="bracket-heading">
          {room}
          <div className="bracket-separator" />
        </div>
        <div
          className={`bracket-user-row${wrap ? ' bracket-user-row-wrap' : n > fitCount ? ' deck-style' : ''}`}
          style={{ position: 'relative', minHeight: wrap ? 360 : 180, flexWrap: wrap ? 'wrap' : 'nowrap', display: 'flex', alignItems: 'flex-start', justifyContent, gap: 8 }}
          ref={el => { rowRefs.current[idx] = el; }}
        >
          {usersAtStep.map((user) => (
            <UserCard key={user.id} user={user} />
          ))}
        </div>
      </div>
    );
  });

  // --- Scaling logic ---
  const bracketRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    function updateScale() {
      if (bracketRef.current) {
        const bracketHeight = bracketRef.current.offsetHeight;
        const windowHeight = window.innerHeight;
        // Add a larger margin (e.g., 48px)
        const margin = 48;
        const availableHeight = windowHeight - margin;
        let newScale = availableHeight / bracketHeight;
        // Allow more aggressive scaling, but set a minimum scale (e.g., 0.5)
        if (newScale > 1) newScale = 1;
        if (newScale < 0.5) newScale = 0.5;
        setScale(newScale);
      }
    }
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [rows.length, users.length]);

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', marginTop: 16 }}>
      <div
        ref={bracketRef}
        style={{
          transform: `scale(${scale})`,
          transformOrigin: 'top center',
          transition: 'transform 0.2s',
          width: '100%',
          maxWidth: 1200,
        }}
      >
        <div className="bracket-container">
          {rows}
        </div>
      </div>
    </div>
  );
} 