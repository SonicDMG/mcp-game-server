"use client";
import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import './globals.css';
import { Location as GameLocation } from '@/app/api/game/types';
import Leaderboard, { LeaderboardUser } from './components/Leaderboard';

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

interface Stats {
  players: number;
  artifacts: string;
  rooms: string;
  winners: number;
}

interface LeaderboardHUDProps {
  setLeaderboardData?: (data: { story: StoryMetadata; users: LeaderboardUser[]; winners: LeaderboardUser[]; killed: LeaderboardUser[]; stats: Stats }) => void;
}

export function LeaderboardHUD({ setLeaderboardData }: LeaderboardHUDProps) {
  const params = useParams<Record<string, string | undefined>>();
  const storyId = params.id;
  // console.log('[LeaderboardHUD Render] params:', params, 'storyId:', storyId);

  const [users, setUsers] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [story, setStory] = useState<StoryMetadata | null>(null);
  const firstLoad = useRef(true);

  useEffect(() => {
    // console.log('[useEffect fetchMetadata] storyId:', storyId);
    async function fetchMetadata() {
      if (!storyId || storyId === 'undefined') {
        // console.log("[fetchMetadata] storyId is missing or invalid, skipping fetch.");
        setStory(null);
        return;
      }
      // console.log(`[fetchMetadata] Fetching for storyId: ${storyId}`);
      try {
        const res = await fetch(`/api/story-metadata?id=${storyId}`);
        if (res.ok) {
          const data = await res.json();
          // console.log('[fetchMetadata] Received story data:', data);
          setStory(data);
        } else {
          console.error(`[fetchMetadata] Failed to fetch metadata for story ${storyId}:`, res.status);
          setStory(null);
        }
      } catch (error) {
        console.error(`[fetchMetadata] Error fetching metadata for story ${storyId}:`, error);
        setStory(null);
      }
    }
    fetchMetadata();
  }, [storyId]);

  useEffect(() => {
    // console.log('[useEffect fetchLeaderboard] storyId:', storyId);
    async function fetchLeaderboard() {
      if (!storyId || storyId === 'undefined') {
        // console.log("[fetchLeaderboard] storyId is missing or invalid, skipping fetch.");
        setUsers([]);
        if (firstLoad.current) {
            setLoading(false);
            firstLoad.current = false;
        }
        return;
      }
      if (firstLoad.current) setLoading(true);
      // console.log(`[fetchLeaderboard] Fetching for storyId: ${storyId}`);
      try {
        const res = await fetch(`/api/leaderboard?storyId=${storyId}`);
        if (res.ok) {
          const data = await res.json();
          // console.log(`[fetchLeaderboard] Received ${data.length} users.`);
          setUsers(data);
        } else {
          console.error(`[fetchLeaderboard] Failed to fetch leaderboard for story ${storyId}:`, res.status);
          setUsers([]);
        }
      } catch (error) {
        console.error(`[fetchLeaderboard] Error fetching leaderboard for story ${storyId}:`, error);
        setUsers([]);
      }

      if (firstLoad.current) {
        setLoading(false);
        firstLoad.current = false;
      }
    }

    let interval: NodeJS.Timeout | null = null;
    if (storyId && storyId !== 'undefined') {
      // console.log('[useEffect fetchLeaderboard] storyId exists and is valid, setting up fetch and interval.');
      fetchLeaderboard();
      interval = setInterval(fetchLeaderboard, 2000);
    } else {
      // console.log('[useEffect fetchLeaderboard] storyId missing or invalid, not setting up interval.');
      setLoading(false);
      setUsers([]);
      setStory(null);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
        // console.log(`[useEffect fetchLeaderboard] Cleared interval.`);
      }
    };
  }, [storyId]);

  useEffect(() => {
    if (story && users.length > 0 && setLeaderboardData) {
      const winners = users.filter(u => u.isWinner);
      const killed = users.filter(u => u.status === 'killed');
      const items = (story.items || []).map(item => ({ ...item, storyId: '', canTake: true, canUse: false }));
      const collectedItemIds = new Set(users.flatMap(u => u.inventory));
      const totalPlayers = users.length;
      const totalArtifacts = items.length;
      const collectedArtifacts = Array.from(collectedItemIds).length;
      const exploredRooms = new Set(users.flatMap(u => u.room)).size;
      const winnersCount = winners.length;
      const totalRooms = story.rooms.length;
      setLeaderboardData({
        story,
        users,
        winners,
        killed,
        stats: {
          players: totalPlayers,
          artifacts: `${collectedArtifacts} / ${totalArtifacts}`,
          rooms: `${exploredRooms} / ${totalRooms}`,
          winners: winnersCount,
        }
      });
    }
  }, [story, users, setLeaderboardData]);

  // console.log('[LeaderboardHUD Render] Checking loading state:', { storyId, loading, storyExists: !!story });
  if (!storyId || storyId === 'undefined' || loading || !story) {
    return <div style={{ color: '#fff', padding: '2rem' }}>Loading leaderboard…</div>;
  }

  return (
    <div className="leaderboard-hud-root">
      <Leaderboard story={story} users={users} />
    </div>
  );
}

export default LeaderboardHUD; 