"use client";
import React, { useEffect, useState, useRef } from 'react';
import './globals.css';
import BracketFlow from './BracketFlow';
import type { Room } from '../lib/gameLogic';

interface LeaderboardUser {
  id: string;
  inventory: string[];
  reachedGoal: boolean;
  room: string;
}

interface StoryMetadata {
  title: string;
  description: string;
  roomOrder: string[];
  artifacts: string[];
  goalRoom: string;
  rooms: Room[];
  requiredArtifacts: string[];
}

function LeaderboardHUD() {
  const [users, setUsers] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [story, setStory] = useState<StoryMetadata | null>(null);
  const hudHeaderRef = useRef<HTMLDivElement>(null);
  const firstLoad = useRef(true);

  useEffect(() => {
    async function fetchMetadata() {
      const res = await fetch('/api/story-metadata');
      const data = await res.json();
      setStory(data);
    }
    fetchMetadata();
  }, []);

  useEffect(() => {
    async function fetchLeaderboard() {
      if (firstLoad.current) setLoading(true);
      const res = await fetch('/api/leaderboard');
      const data = await res.json();
      setUsers(data);
      if (firstLoad.current) {
        setLoading(false);
        firstLoad.current = false;
      }
    }
    fetchLeaderboard();
    const interval = setInterval(fetchLeaderboard, 2000); // Poll every 2s
    return () => clearInterval(interval);
  }, []);

  if (loading || !story) {
    return <div style={{ color: '#fff', padding: '2rem' }}>Loading leaderboard…</div>;
  }

  return (
    <div className="hud-frame leaderboard-bg-gradient" style={{ width: '100vw', minWidth: 0, padding: '32px 0' }}>
      <div className="hud-header" ref={hudHeaderRef}>
        <span className="hud-title">{story.title || 'MCPlayerOne Leaderboard'}</span>
        <span className="hud-reserved">[Adventure]</span>
      </div>
      <BracketFlow story={story} users={users} />
    </div>
  );
}

export default LeaderboardHUD; 