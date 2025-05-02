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
import styles from './components/Leaderboard.module.css';

export interface LeaderboardUser {
  id: string;
  inventory: string[];
  reachedGoal: boolean;
  room: string;
  isWinner?: boolean;
  killed?: boolean;
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
  // Find killed users (assuming a killed property; if not, use an empty array for now)
  const killed = users.filter(u => u.killed);
  const winnerBanner = (
    <div key="winner-banner" className={styles.bannerContainer}>
      <WinnerBanner winners={winners} killed={killed} onUserClick={handleUserClick} />
    </div>
  );

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
    <div key="main-layout" className={styles.mainLayout}>
      {/* Left: Story Image, StatsPanel, and ItemCollage */}
      <div className={styles.leftColumn}>
        <Image
          src={getProxiedImageUrl(story.image || ROOM_IMAGE_PLACEHOLDER)}
          alt={story.title}
          width={320}
          height={220}
          className={styles.storyImage}
          onClick={() => setZoomedImage(story.image || ROOM_IMAGE_PLACEHOLDER)}
          unoptimized
        />
        <div className={styles.statsPanel}>
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
        <div className={styles.itemCollage}>
          <ItemCollage items={items} collectedItemIds={collectedItemIds} setZoomedItem={setZoomedItem} />
        </div>
      </div>
      {/* Right: Info and Map */}
      <div className={styles.rightContent}>
        <div style={{ color: color.heading, fontWeight: 900, fontSize: '2.1rem', textAlign: 'left', marginBottom: 10, letterSpacing: 1 }}>{story.title}</div>
        <div style={{ color: '#b3b3d1', fontSize: '1.15rem', marginBottom: 14 }}>{story.description}</div>
        {story.requiredArtifacts && story.requiredArtifacts.length > 0 && (
          <div style={{ color: '#a7a7ff', fontSize: '1.08rem', marginBottom: 22 }}>
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
    <div className={styles.leaderboardContainer}>
      <div className="main-content" style={{ fontFamily: 'monospace', background: 'none', color: '#fff' }}>
        {/* Header Row: WinnerBanner only */}
        <div className={styles.headerRow}>
          <div className={styles.bannerContainer}>
            {winnerBanner}
          </div>
        </div>
        {asciiRows}
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
      </div>
    </div>
  );
} 