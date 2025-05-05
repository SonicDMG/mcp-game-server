'use client';
import React, { useState } from 'react';
import LeaderboardHUD from '../../MazeMuralGrid';
import UserDetailCard from '../../UserDetailCard';
import type { LeaderboardUser } from '../../components/Leaderboard';
import { Location as GameLocation } from '@/app/api/game/types';
import AppFooter from '../../components/AppFooter';
import AppHeader from '../../components/AppHeader';

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

interface LeaderboardData {
  story: StoryMetadata;
  users: LeaderboardUser[];
  winners: LeaderboardUser[];
  killed: LeaderboardUser[];
  stats: {
    players: number;
    artifacts: string;
    rooms: string;
    winners: number;
  };
}

export default function StoryLeaderboardPage() {
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardData | null>(null);
  const [selectedUser, setSelectedUser] = useState<LeaderboardUser | null>(null);

  const handleUserClick = (user: LeaderboardUser) => {
    setSelectedUser(user);
  };

  const handleCloseCard = () => {
    setSelectedUser(null);
  };

  return (
    <div className="app-root">
      <AppHeader
        logoUrl="/images/logo.png"
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Story' }]}
        onUserClick={handleUserClick}
        stats={leaderboardData?.stats || { players: 0, artifacts: '', rooms: '', winners: 0 }}
        winners={leaderboardData?.winners}
        killed={leaderboardData?.killed}
      />
      <main className="hud-frame leaderboard-bg-gradient" style={{ width: '100vw', padding: '16px 0 32px 0' }}>
        <LeaderboardHUD setLeaderboardData={setLeaderboardData} />
        {selectedUser && leaderboardData && (
          <UserDetailCard
            user={selectedUser}
            story={leaderboardData.story}
            items={(leaderboardData.story.items || []).map(item => ({
              ...item,
              storyId: leaderboardData.story.title,
              canTake: true,
              canUse: false,
            }))}
            onClose={handleCloseCard}
          />
        )}
      </main>
      <AppFooter />
    </div>
  );
} 