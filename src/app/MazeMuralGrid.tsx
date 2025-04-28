"use client";
import React, { useEffect, useState, useRef } from 'react';
import './globals.css';
import BracketFlow from './BracketFlow';
import type { Room } from '../lib/gameLogic';
import Image from 'next/image';
import Link from 'next/link';
import AsciiLeaderboard from './AsciiLeaderboard';

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

export function LeaderboardHUD() {
  const [users, setUsers] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [story, setStory] = useState<StoryMetadata | null>(null);
  const hudHeaderRef = useRef<HTMLDivElement>(null);
  const firstLoad = useRef(true);
  const [asciiMode, setAsciiMode] = React.useState(true);

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
    <div className="leaderboard-hud-root">
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
        <button
          onClick={() => setAsciiMode(true)}
          style={{
            background: asciiMode ? '#222' : '#111',
            color: asciiMode ? '#3b82f6' : '#aaa',
            border: '1px solid #3b82f6',
            borderRadius: 6,
            padding: '6px 18px',
            marginRight: 8,
            fontWeight: asciiMode ? 700 : 400,
            cursor: 'pointer',
            fontFamily: 'monospace',
            fontSize: '1rem',
            transition: 'all 0.15s',
          }}
        >
          ASCII Art
        </button>
        <button
          onClick={() => setAsciiMode(false)}
          style={{
            background: !asciiMode ? '#222' : '#111',
            color: !asciiMode ? '#a78bfa' : '#aaa',
            border: '1px solid #a78bfa',
            borderRadius: 6,
            padding: '6px 18px',
            fontWeight: !asciiMode ? 700 : 400,
            cursor: 'pointer',
            fontFamily: 'monospace',
            fontSize: '1rem',
            transition: 'all 0.15s',
          }}
        >
          Graphical
        </button>
      </div>
      {asciiMode ? (
        <AsciiLeaderboard story={story} users={users} />
      ) : (
        <BracketFlow story={story} users={users} />
      )}
    </div>
  );
}

export default LeaderboardHUD; 