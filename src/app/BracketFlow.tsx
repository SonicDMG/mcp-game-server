import React, { useEffect, useRef, useState } from 'react';

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
  rooms: any[];
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

  // Responsive user card component
  const UserCard = ({ user }: { user: LeaderboardUser }) => (
    <div className="bracket-user-card-portrait">
      <img
        className="bracket-user-avatar"
        src="https://api.dicebear.com/7.x/pixel-art/svg?seed=placeholder"
        alt="avatar"
      />
      {user.id}
      <div className="bracket-user-card-artifacts">
        {user.inventory.length} Artifacts
      </div>
    </div>
  );

  // For each row, filter users at that progress
  const rows = rooms.map((room, idx) => {
    // Users at this step: step 0 = goal, step N = start
    const stepIdx = idx;
    const usersAtStep = users.filter(u => {
      const artifactCount = Math.min(u.inventory.length, maxRooms - 1);
      return (u.reachedGoal ? 0 : totalSteps - 1 - artifactCount) === stepIdx;
    });
    return (
      <div key={room} className="bracket-row">
        <div className="bracket-heading">
          {room}
          <div className="bracket-separator" />
        </div>
        <div className="bracket-user-row">
          {usersAtStep.map(user => <UserCard key={user.id} user={user} />)}
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
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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