"use client";
import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { getProxiedImageUrl } from '../api/game/types';
import UserDetailCard from '../UserDetailCard';
import { Location as GameLocation } from '../api/game/types';
import ItemCollage from './ItemCollage';
import StatsPanel from './StatsPanel';
import RoomGrid from './RoomGrid';
import UserListModal from './UserListModal';
import ZoomedItemModal from './ZoomedItemModal';
import styles from './Leaderboard.module.css';
import Confetti from 'react-confetti';
import { RoomChat } from './RoomChat';
import AudioInteraction from './AudioInteraction';

export interface LeaderboardUser {
  id: string;
  inventory: string[];
  reachedGoal: boolean;
  room: string;
  isWinner?: boolean;
  status?: 'playing' | 'winner' | 'killed';
  name?: string;
  displayName?: string;
  username?: string;
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

// Utility to clean up story titles (duplicated from backend for frontend use)
function cleanTitle(title: string): string {
  // Remove leading prefixes
  title = title.replace(/^(Story:|Game:|Title:|The Adventure of)\s*/i, '');
  // Remove anything in parentheses (byline-style)
  title = title.replace(/\s*\(.*?\)\s*/g, '');
  // Truncate at the first colon, if present
  const colonIdx = title.indexOf(":");
  if (colonIdx !== -1) title = title.slice(0, colonIdx);
  // Trim whitespace
  return title.trim();
}

export default function Leaderboard({ story, users, roomId }: LeaderboardProps & { roomId: string }) {
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

  const handleZoomImage = (img: string, name: string, description: string, roomId: string) => {
    setZoomedRoom({ image: img, name, description, users: users.filter(u => u.room === roomId) });
  };

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
      <div className={styles.mainContent}>
        {/* Mobile: stack everything vertically in the desired order */}
        <div className={styles.mobileStack}>
          <Image
            src={getProxiedImageUrl(story.image || ROOM_IMAGE_PLACEHOLDER)}
            alt={cleanTitle(story.title)}
            width={320}
            height={220}
            className={styles.storyImage}
            onClick={() => setZoomedImage(story.image || ROOM_IMAGE_PLACEHOLDER)}
            unoptimized
          />
          <div className={styles.titleDescriptionContainer}>
            <div className={styles.bannersAndAudioRow}>
              <div className={styles.bannersSection}>
                <div className={styles.bannerText}>
                  {winners.length} Winner{winners.length > 1 ? 's' : ''}
                </div>
                <div className={`${styles.bannerText} ${styles.killed}`}>
                  {killed.length} Killed
                </div>
              </div>
              <div className={styles.audioInteractionSection}>
                <AudioInteraction storyId={roomId} />
              </div>
            </div>
            <div className={styles.storyTitle}>{cleanTitle(story.title)}</div>
          </div>
          <div className={styles.storyDescription}>{story.description}</div>
          {story.requiredArtifacts && story.requiredArtifacts.length > 0 && (
            <div className={styles.goalText}>
              <b>Goal:</b> Collect all artifacts and reach the final room.
            </div>
          )}
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
          <RoomChat roomId={roomId} />
          <div className={styles.roomGridWrapper}>
            <RoomGrid
              rooms={story.rooms}
              users={users}
              goalRoom={story.goalRoom}
              setZoomedImage={handleZoomImage}
              setSelectedUser={setSelectedUser}
              setUserListModal={setUserListModal}
              _storyId={story.roomOrder && story.roomOrder.length > 0 ? story.roomOrder[0] : story.title}
            />
          </div>
        </div>
        {/* Desktop: keep the current layout */}
        <div className={styles.mainLayout}>
          <div className={styles.leftColumn}>
            <Image
              src={getProxiedImageUrl(story.image || ROOM_IMAGE_PLACEHOLDER)}
              alt={cleanTitle(story.title)}
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
              <RoomChat roomId={roomId} />
            </div>
          </div>
          <div className={styles.rightContent}>
            <div className={styles.bannersAndAudioRow}>
              <div className={styles.bannersSection}>
                <div className={styles.bannerText}>
                  {winners.length} Winner{winners.length > 1 ? 's' : ''}
                </div>
                <div className={`${styles.bannerText} ${styles.killed}`}>
                  {killed.length} Killed
                </div>
              </div>
              <div className={styles.audioInteractionSection}>
                <AudioInteraction storyId={roomId} />
              </div>
            </div>
            <div className={styles.storyTitle}>{cleanTitle(story.title)}</div>
            <div className={styles.storyDescription}>{story.description}</div>
            {story.requiredArtifacts && story.requiredArtifacts.length > 0 && (
              <div className={styles.goalText}>
                <b>Goal:</b> Collect all artifacts and reach the final room.
              </div>
            )}
            <div className={styles.roomGridWrapper}>
              <RoomGrid
                rooms={story.rooms}
                users={users}
                goalRoom={story.goalRoom}
                setZoomedImage={handleZoomImage}
                setSelectedUser={setSelectedUser}
                setUserListModal={setUserListModal}
                _storyId={story.roomOrder && story.roomOrder.length > 0 ? story.roomOrder[0] : story.title}
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
            name={cleanTitle(story.title)}
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