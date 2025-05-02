'use client';
import React, { useState } from 'react';
import LeaderboardHUD from '../../MazeMuralGrid';
import Image from 'next/image';
import Link from 'next/link';
import { WinnerSection, KilledSection } from '../../components/WinnerBanner';
import UserDetailCard from '../../UserDetailCard';
import { LeaderboardUser } from '../../AsciiLeaderboard';
import { Location as GameLocation } from '@/app/api/game/types';
import AppFooter from '../../components/AppFooter';

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
      <header className="app-header" style={{ position: 'sticky', top: 0, zIndex: 200, background: 'rgba(18, 22, 40, 0.98)', boxShadow: '0 2px 16px #000a', padding: '0.5rem 0', display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
        <div className="breadcrumb" style={{ alignSelf: 'flex-start', marginLeft: 32, marginBottom: 4 }}>
          <Link href="/" className="breadcrumb-link">
            Home
          </Link>
          <span>/</span>
          <span style={{ color: '#a78bfa' }}>Story</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
          {leaderboardData && (
            <div style={{ display: 'flex', alignItems: 'center', marginRight: 24 }}>
              <WinnerSection winners={leaderboardData.winners} onUserClick={handleUserClick} />
            </div>
          )}
          <Image src="/images/logo.png" alt="MCP Logo" width={160} height={160} className="app-logo" style={{ objectFit: 'contain', display: 'block' }} />
          {leaderboardData && (
            <div style={{ display: 'flex', alignItems: 'center', marginLeft: 24 }}>
              <KilledSection killed={leaderboardData.killed} onUserClick={handleUserClick} />
            </div>
          )}
        </div>
      </header>
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