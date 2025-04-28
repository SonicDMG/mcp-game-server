"use client";
import React, { useEffect, useState, useRef } from 'react';
import './globals.css';
import BracketFlow from './BracketFlow';
import type { Room } from '../lib/gameLogic';
import Image from 'next/image';
import Link from 'next/link';

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
    <div className="app-root">
      <header className="app-header">
        <nav style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', width: '100%', justifyContent: 'flex-start', gap: 12, position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Link href="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none', gap: 8 }}>
              <Image src="/images/logo.png" alt="App Logo" width={40} height={40} className="app-logo" />
              <span style={{ color: '#a78bfa', fontWeight: 600, fontSize: '1.1rem' }}>Home</span>
            </Link>
          </div>
          <span style={{ color: '#a78bfa', fontSize: '1.5rem', margin: '0 8px' }}>&#8250;</span>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: '1.2rem' }}>{story.title}</span>
        </nav>
      </header>
      <main className="hud-frame leaderboard-bg-gradient" style={{ width: '100vw', minWidth: 0, padding: '16px 0 32px 0' }}>
        <div className="hud-header" ref={hudHeaderRef}>
          <span className="hud-reserved">[Adventure]</span>
        </div>
        <BracketFlow story={story} users={users} />
      </main>
      <footer className="app-footer">
        <span>© {new Date().getFullYear()} Maze Adventure</span>
      </footer>
    </div>
  );
}

export default LeaderboardHUD; 