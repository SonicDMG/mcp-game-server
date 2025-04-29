import React, { useState } from 'react';
import Image from 'next/image';
import UserDetailCard from './UserDetailCard';
import { Location as GameLocation } from '@/app/api/game/types';

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

export default function AsciiLeaderboard({ story, users }: AsciiLeaderboardProps) {
  const [selectedUser, setSelectedUser] = useState<LeaderboardUser | null>(null);

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
        {winners.map((winner) => (
          <div key={winner.id} style={{ 
            display: 'inline-flex', 
            alignItems: 'center',
            margin: '4px 12px',
            padding: '4px 12px',
            background: 'rgba(251, 191, 36, 0.15)',
            borderRadius: '4px'
          }}>
            <WinnerCrown />
            <Image 
              src={avatarUrl(winner.id)} 
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
              onClick={() => setSelectedUser(winner)}
            >
              {winner.id}
            </span>
            {winner.isWinner && <WinnerSparkles />}
          </div>
        ))}
      </div>
    );
  }

  // Reverse the room order for display
  [...story.roomOrder].reverse().forEach((room) => {
    const usersInRoom = users.filter(u => u.room === room && !u.reachedGoal); // Don't show winners in room list
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