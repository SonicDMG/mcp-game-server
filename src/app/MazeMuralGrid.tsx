"use client";
import React, { useEffect, useState, useRef } from 'react';
import { usePathname } from 'next/navigation';
import './globals.css';
import { Location as GameLocation } from '@/app/api/game/types';
import AsciiLeaderboard from './AsciiLeaderboard';

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

export function LeaderboardHUD() {
  const [users, setUsers] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [story, setStory] = useState<StoryMetadata | null>(null);
  const firstLoad = useRef(true);
  const pathname = usePathname();

  const storyId = pathname?.split('/').pop() || 'mystic_library';

  useEffect(() => {
    async function fetchMetadata() {
      const res = await fetch(`/api/story-metadata?id=${storyId}`);
      if (res.ok) {
        const data = await res.json();
        setStory(data);
      } else {
        console.error(`Failed to fetch metadata for story ${storyId}:`, res.status);
      }
    }
    if (storyId) {
      fetchMetadata();
    }
  }, [storyId]);

  useEffect(() => {
    async function fetchLeaderboard() {
      if (firstLoad.current) setLoading(true);
      const res = await fetch(`/api/leaderboard?storyId=${storyId}`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      } else {
        console.error(`Failed to fetch leaderboard for story ${storyId}:`, res.status);
      }
      
      if (firstLoad.current) {
        setLoading(false);
        firstLoad.current = false;
      }
    }
    
    if (storyId) {
        fetchLeaderboard();
        const interval = setInterval(fetchLeaderboard, 2000);
        return () => clearInterval(interval);
    }
  }, [storyId]);

  if (loading || !story) {
    return <div style={{ color: '#fff', padding: '2rem' }}>Loading leaderboard…</div>;
  }

  return (
    <div className="leaderboard-hud-root">
      <AsciiLeaderboard story={story} users={users} />
    </div>
  );
}

export default LeaderboardHUD; 