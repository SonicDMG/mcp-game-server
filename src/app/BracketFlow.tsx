import React from 'react';

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
    <div className="bracket-user-card">
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

  return (
    <div className="bracket-container">
      {rows}
    </div>
  );
} 