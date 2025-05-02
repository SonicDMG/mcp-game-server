import React, { useState } from 'react';
import Image from 'next/image';
import { getProxiedImageUrl } from './api/game/types';
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

export default function AsciiLeaderboard({ story, users }: AsciiLeaderboardProps) {
  const [selectedUser, setSelectedUser] = useState<LeaderboardUser | null>(null);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
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

  // Reverse the room order for display
  [...story.roomOrder].reverse().forEach((room) => {
    const usersInRoom = users.filter(u => u.room === room && !u.reachedGoal); // Don't show winners in room list
    const roomObj = story.rooms.find(r => r.id === room);
    asciiRows.push(
      <div key={room} style={{ margin: '16px 0 0 0', fontFamily: 'monospace', fontSize: '1.08rem' }}>
        <Image
          src={getProxiedImageUrl(roomObj?.image || ROOM_IMAGE_PLACEHOLDER)}
          alt={roomObj?.name || room}
          width={80}
          height={50}
          style={{ borderRadius: 8, marginBottom: 4, objectFit: 'cover', background: '#222', cursor: 'zoom-in' }}
          onClick={() => setZoomedImage(roomObj?.image || ROOM_IMAGE_PLACEHOLDER)}
        />
        <div style={{ color: color.room, fontWeight: 600, marginBottom: 2 }}>{room}</div>
        <pre style={{ background: 'none', color: color.user, margin: 0, padding: 0, lineHeight: 1.7, fontFamily: 'inherit', fontSize: 'inherit', display: 'flex', flexWrap: 'wrap', alignItems: 'center' }}>
          {usersInRoom.length === 0 ? (
            <span style={{ color: '#888' }}>(no users)</span>
          ) : (
            usersInRoom.map((user, i) => (
              <span key={user.id} style={{ display: 'flex', alignItems: 'center', marginRight: 18, marginBottom: 4 }}>
                <Image 
                  src={getProxiedImageUrl(avatarUrl(user.id))} 
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
                  onClick={() => handleUserClick(user)}
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
    </>
  );
} 