'use client';
import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import LeaderboardHUD from '../../MazeMuralGrid';
import UserDetailCard from '../../UserDetailCard';
import type { LeaderboardUser } from '../../components/Leaderboard';
import { Location as GameLocation } from '@/app/api/game/types';
import AppFooter from '../../components/AppFooter';
import AppHeader from '../../components/AppHeader';
import EventFeed from '../../components/EventFeed';
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
  const params = useParams();
  const storyId = params.id as string;
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
        eventFeed={<EventFeed storyId={storyId} />}
      />
      <main className={`hud-frame leaderboard-bg-gradient ${mainContentStyles.mainContent}`}>
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