import React, { useState } from 'react';
import Image from 'next/image';
import { getProxiedImageUrl } from './api/game/types';
import UserDetailCard from './UserDetailCard';
import { Location as GameLocation } from '@/app/api/game/types';
import ItemCollage from './components/ItemCollage';
import StatsPanel from './components/StatsPanel';
import WinnerBanner from './components/WinnerBanner';
import RoomGrid from './components/RoomGrid';
import UserListModal from './components/UserListModal';
import ZoomedItemModal from './components/ZoomedItemModal';

export interface LeaderboardUser {
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
  image?: string;
  items?: Array<{ id: string; name: string; description: string; image?: string }>;
}

interface AsciiLeaderboardProps {
  story: StoryMetadata;
  users: LeaderboardUser[];
}

const color = {
  heading: '#3b82f6',
  room: '#a78bfa',
  user: '#06b6d4',
  artifact: '#fff',
  winner: '#fbbf24',
  sparkle: '#fef08a',
};

const ROOM_IMAGE_PLACEHOLDER = "/images/room-placeholder.png"; // Place this image in your public/images/ directory or use a remote URL

export default function AsciiLeaderboard({ story, users }: AsciiLeaderboardProps) {
  const [selectedUser, setSelectedUser] = useState<LeaderboardUser | null>(null);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [zoomedItem, setZoomedItem] = useState<{ image: string; name: string; description: string } | null>(null);
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

  // Find winners (users who have reached the goal)
  const winners = users.filter(u => u.reachedGoal);
  if (winners.length > 0) {
    asciiRows.push(
      <WinnerBanner key="winners" winners={winners} onUserClick={handleUserClick} />
    );
  }

  // --- Collage and Stats Data ---
  const items = (story.items || []).map(item => ({
    ...item,
    storyId: '',
    canTake: true,
    canUse: false,
  }));
  // All item IDs collected by any player
  const collectedItemIds = new Set(users.flatMap(u => u.inventory));
  // Stats
  const totalPlayers = users.length;
  const totalArtifacts = items.length;
  const collectedArtifacts = Array.from(collectedItemIds).length;
  const exploredRooms = new Set(users.flatMap(u => u.room)).size;
  const winnersCount = users.filter(u => u.reachedGoal).length;
  const totalRooms = story.rooms.length;

  // --- Main Layout Update ---
  asciiRows.push(
    <div key="main-layout" style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', gap: '2.5rem', width: '100%', minHeight: '70vh', margin: '2rem 0 2rem 0' }}>
      {/* Left: Story Image, StatsPanel, and ItemCollage */}
      <div style={{ flex: '0 0 340px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', width: 340 }}>
        <Image
          src={getProxiedImageUrl(story.image || ROOM_IMAGE_PLACEHOLDER)}
          alt={story.title}
          width={320}
          height={220}
          style={{ objectFit: 'cover', borderRadius: 16, boxShadow: '0 4px 32px #000a', cursor: 'zoom-in', marginBottom: 12, background: '#222', width: 320, maxWidth: 320 }}
          onClick={() => setZoomedImage(story.image || ROOM_IMAGE_PLACEHOLDER)}
          unoptimized
        />
        <div style={{ width: 320, maxWidth: 320, marginBottom: 8 }}>
          <StatsPanel
            totalPlayers={totalPlayers}
            collectedArtifacts={collectedArtifacts}
            totalArtifacts={totalArtifacts}
            exploredRooms={exploredRooms}
            totalRooms={totalRooms}
            winnersCount={winnersCount}
            killedCount={0}
          />
        </div>
        <div style={{ width: 320, maxWidth: 320 }}>
          <ItemCollage items={items} collectedItemIds={collectedItemIds} setZoomedItem={setZoomedItem} />
        </div>
      </div>
      {/* Right: Info and Map */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ color: color.heading, fontWeight: 700, fontSize: '1.5rem', textAlign: 'left', marginBottom: 0 }}>{story.title}</div>
        <div style={{ color: '#b3b3d1', fontSize: '1.08rem', marginBottom: 8 }}>{story.description}</div>
        {story.requiredArtifacts && story.requiredArtifacts.length > 0 && (
          <div style={{ color: '#a7a7ff', fontSize: '1.02rem', marginBottom: 16 }}>
            <b>Goal:</b> Collect all artifacts and reach the final room.
          </div>
        )}
        <div style={{ flex: 1, height: '100%', width: '100%' }}>
          <RoomGrid
            rooms={story.rooms}
            users={users}
            setZoomedImage={setZoomedImage}
            setSelectedUser={setSelectedUser}
            setUserListModal={setUserListModal}
          />
        </div>
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
          items={items}
          onClose={handleCloseCard}
        />
      )}
      {zoomedImage && (
        <ZoomedItemModal
          image={zoomedImage}
          name={story.title}
          description={story.description}
          onClose={() => setZoomedImage(null)}
        />
      )}
      {zoomedItem && (
        <ZoomedItemModal
          image={zoomedItem.image}
          name={zoomedItem.name}
          description={zoomedItem.description}
          onClose={() => setZoomedItem(null)}
        />
      )}
      {userListModal && (
        <UserListModal
          room={userListModal.room}
          users={userListModal.users}
          setSelectedUser={setSelectedUser}
          onClose={() => setUserListModal(null)}
        />
      )}
    </>
  );
} 