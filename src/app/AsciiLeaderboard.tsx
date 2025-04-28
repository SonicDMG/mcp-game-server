import React, { useState } from 'react';
import Image from 'next/image';
import UserDetailCard from './UserDetailCard';

interface LeaderboardUser {
  id: string;
  inventory: string[];
  reachedGoal: boolean;
  room: string;
}

interface Room {
  id: string;
  description: string;
  exits: Record<string, string>;
  artifact?: string;
  goal?: boolean;
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
};

export default function AsciiLeaderboard({ story, users }: AsciiLeaderboardProps) {
  const [selectedUser, setSelectedUser] = useState<LeaderboardUser | null>(null);

  // Build ASCII art string and avatar map
  const asciiRows: React.ReactNode[] = [];
  asciiRows.push(
    <div key="title" style={{ color: color.heading, fontWeight: 700, fontSize: '1.3rem', marginBottom: 8, textAlign: 'center' }}>
      {story.title} <span style={{ color: color.room }}>[Adventure]</span>
    </div>
  );
  // Reverse the room order for display
  [...story.roomOrder].reverse().forEach((room, idx) => {
    const usersInRoom = users.filter(u => u.room === room);
    asciiRows.push(
      <div key={room} style={{ margin: '16px 0 0 0', fontFamily: 'monospace', fontSize: '1.08rem' }}>
        <div style={{ color: color.room, fontWeight: 600, marginBottom: 2 }}>{room}</div>
        <pre style={{ background: 'none', color: color.user, margin: 0, padding: 0, lineHeight: 1.7, fontFamily: 'inherit', fontSize: 'inherit', display: 'flex', flexWrap: 'wrap', alignItems: 'center' }}>
          {usersInRoom.length === 0 ? (
            <span style={{ color: '#888' }}>(no users)</span>
          ) : (
            usersInRoom.map((user, i) => (
              <span key={user.id} style={{ display: 'flex', alignItems: 'center', marginRight: 18, marginBottom: 4 }}>
                <Image 
                  src={avatarUrl(user.id)} 
                  alt="avatar" 
                  width={24} 
                  height={24} 
                  style={{ borderRadius: 4, marginRight: 4, background: '#222' }} 
                />
                <span 
                  style={{ 
                    color: color.user, 
                    fontWeight: 600,
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    textDecorationStyle: 'dotted',
                    textDecorationColor: 'rgba(59, 130, 246, 0.4)',
                  }}
                  onClick={() => setSelectedUser(user)}
                >
                  {user.id}
                </span>
                <span style={{ color: color.artifact, marginLeft: 4, fontWeight: 400 }}>
                  ({user.inventory.length} Artifact{user.inventory.length === 1 ? '' : 's'})
                </span>
                {i < usersInRoom.length - 1 && <span style={{ color: '#444', margin: '0 6px' }}>|</span>}
              </span>
            ))
          )}
        </pre>
      </div>
    );
  });

  return (
    <>
      <div style={{ fontFamily: 'monospace', background: 'none', color: '#fff', width: '100%', maxWidth: 900, margin: '0 auto', padding: 12 }}>
        {asciiRows}
      </div>
      {selectedUser && (
        <UserDetailCard
          user={selectedUser}
          story={story}
          onClose={() => setSelectedUser(null)}
        />
      )}
    </>
  );
} 