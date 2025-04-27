"use client";
import React, { useEffect, useState, useRef } from 'react';
import './globals.css';
import BracketFlow from './BracketFlow';

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
  rooms: any[];
  requiredArtifacts: string[];
}

function getProgressPercent(room: string, reachedGoal: boolean, roomOrder: string[]): number {
  if (reachedGoal) return 100;
  const step = roomOrder.indexOf(room);
  if (step === -1) return 0;
  return Math.round((step / (roomOrder.length - 1)) * 100);
}

function getCardLeft(progress: number, cardWidth: number = 180, barWidth: number = 1100) {
  // Clamp so card doesn't overflow at 0% or 100%
  const px = (progress / 100) * (barWidth - cardWidth);
  return `${px}px`;
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