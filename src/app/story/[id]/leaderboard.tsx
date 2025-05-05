"use client";
import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { getProxiedImageUrl } from '../../api/game/types';
import UserDetailCard from '../../UserDetailCard';
import { Location as GameLocation } from '@/app/api/game/types';
import ItemCollage from '../../components/ItemCollage';
import StatsPanel from '../../components/StatsPanel';
import RoomGrid from '../../components/RoomGrid';
import UserListModal from '../../components/UserListModal';
import ZoomedItemModal from '../../components/ZoomedItemModal';
import styles from '../../components/Leaderboard.module.css';
import Confetti from 'react-confetti';

export interface LeaderboardUser {
  id: string;
  inventory: string[];
  reachedGoal: boolean;
  room: string;
  isWinner?: boolean;
  status?: 'playing' | 'winner' | 'killed';
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

interface LeaderboardProps {
  story: StoryMetadata;
  users: LeaderboardUser[];
}

const ROOM_IMAGE_PLACEHOLDER = "/images/room-placeholder.png"; // Place this image in your public/images/ directory or use a remote URL

export default function Leaderboard({ story, users }: LeaderboardProps) {
  const [selectedUser, setSelectedUser] = useState<LeaderboardUser | null>(null);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [zoomedItem, setZoomedItem] = useState<{ image: string; name: string; description: string } | null>(null);
  const [userListModal, setUserListModal] = useState<{ room: string; users: LeaderboardUser[] } | null>(null);
  const [zoomedRoom, setZoomedRoom] = useState<{ image: string; name: string; description: string; users: LeaderboardUser[] } | null>(null);
  const prevKilledCount = useRef(users.filter(u => u.status === 'killed').length);
  const killedCount = users.filter(u => u.status === 'killed').length;

  useEffect(() => {
    if (killedCount > prevKilledCount.current) {
      // (Optional: trigger any effect here if needed)
    }
    prevKilledCount.current = killedCount;
  }, [killedCount]);

  // --- Collage and Stats Data ---
  const items = (story.items || []).map(item => ({
    ...item,
    storyId: '',
    canTake: true,
    canUse: false,
  }));
  const collectedItemIds = new Set(users.flatMap(u => u.inventory));
  const totalPlayers = users.length;
  const totalArtifacts = items.length;
  const collectedArtifacts = Array.from(collectedItemIds).length;
  const exploredRooms = new Set(users.flatMap(u => u.room)).size;
  const winners = users.filter(u => u.isWinner);
  const killed = users.filter(u => u.status === 'killed');
  const totalRooms = story.rooms.length;

  // Add keyframes for shake only
  if (typeof window !== 'undefined' && !document.getElementById('shake-keyframes')) {
    const style = document.createElement('style');
    style.id = 'shake-keyframes';
    style.innerHTML = `@keyframes shake { 0% { transform: translateX(0); } 10%, 30%, 50%, 70%, 90% { transform: translateX(-8px); } 20%, 40%, 60%, 80% { transform: translateX(8px); } 100% { transform: translateX(0); } }`;
    document.head.appendChild(style);
  }

  return (
    <div className={styles.leaderboardContainer}>
      {/* Confetti Fanfare */}
      {winners.length > 0 && (
        <Confetti
          width={typeof window !== 'undefined' ? window.innerWidth : 1200}
          height={typeof window !== 'undefined' ? window.innerHeight : 800}
          numberOfPieces={350}
          recycle={false}
        />
      )}
      <div className="main-content" style={{ fontFamily: 'monospace', background: 'none', color: '#fff' }}>
        <div className={styles.mainLayout}>
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
                winnersCount={winners.length}
                killedCount={killed.length}
              />
            </div>
            <div className={styles.itemCollage}>
              <ItemCollage items={items} collectedItemIds={collectedItemIds} requiredArtifacts={story.requiredArtifacts || []} setZoomedItem={setZoomedItem} />
            </div>
          </div>
          {/* Right: Info and Map */}
          <div className={styles.rightContent}>
            <div className={styles.titleDescriptionContainer}>
              <div className={styles.storyTitle}>{story.title}</div>
              <div className={styles.storyDescription}>{story.description}</div>
              {story.requiredArtifacts && story.requiredArtifacts.length > 0 && (
                <div style={{ color: '#a7a7ff', fontSize: '1.08rem', marginBottom: 22 }}>
                  <b>Goal:</b> Collect all artifacts and reach the final room.
                </div>
              )}
            </div>
            <div style={{ flex: 1, height: '100%', width: '100%' }}>
              <RoomGrid
                rooms={story.rooms}
                users={users}
                goalRoom={story.goalRoom}
                setZoomedImage={(img, name, description, roomId) => {
                  setZoomedRoom({ image: img, name, description, users: users.filter(u => u.room === roomId) });
                }}
                setSelectedUser={setSelectedUser}
                setUserListModal={setUserListModal}
              />
            </div>
          </div>
        </div>
        {selectedUser && (
          <UserDetailCard
            user={selectedUser}
            story={story}
            items={items}
            onClose={() => setSelectedUser(null)}
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
        {zoomedRoom && (
          <ZoomedItemModal
            image={zoomedRoom.image}
            name={zoomedRoom.name}
            description={zoomedRoom.description}
            users={zoomedRoom.users}
            onClose={() => setZoomedRoom(null)}
          />
        )}
        {userListModal && (
          <UserListModal
            room={userListModal.room}
            users={userListModal.users}
            setSelectedUser={setSelectedUser}
            onClose={() => setUserListModal(null)}
            requiredArtifacts={story.requiredArtifacts || []}
          />
        )}
      </div>
    </div>
  );
} 