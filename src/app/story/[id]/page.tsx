'use client';
import React, { useState } from 'react';

import LeaderboardHUD from '../../MazeMuralGrid';
import UserDetailCard from '../../UserDetailCard';
import type { LeaderboardUser } from '../../components/Leaderboard';
import { Location as GameLocation } from '@/app/api/game/types';
import AppFooter from '../../components/AppFooter';
import AppHeader from '../../components/AppHeader';
import ActionsGuide from '../../components/ActionsGuide';

import mainContentStyles from '../../components/MainContent.module.css';

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



  const handleCloseCard = () => {
    setSelectedUser(null);
  };

  return (
    <div className="app-root">
      <AppHeader
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Story' }]}
      />
      <main className={`hud-frame leaderboard-bg-gradient ${mainContentStyles.mainContent}`}>
        <ActionsGuide />
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