"use client";
import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import styles from './EventFeed.module.css';

interface EventFeedProps {
  storyId: string;
  limit?: number;
}

interface GameEvent {
  _id: string;
  storyId: string;
  type: string;
  message: string;
  actor?: string;
  target?: string;
  timestamp: string;
}

const typeIcon: Record<string, string> = {
  kill: "⚔️",
  "kill-fail": "❌",
  counter: "🔄",
  win: "🏆",
  loot: "💰",
  take: "👜",
  move: "🚶",
};

export default function EventFeed({ storyId, limit = 20 }: EventFeedProps) {
  const [events, setEvents] = useState<GameEvent[]>([]);
  const marqueeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchEvents = async () => {
      try {
        const res = await fetch(`/api/game/events?storyId=${storyId}&limit=${limit}`);
        if (!res.ok) return;
        const data = await res.json();
        if (Array.isArray(data) && isMounted) {
          setEvents(data);
        }
      } catch {}
    };
    fetchEvents();
    const interval = setInterval(fetchEvents, 10000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [storyId, limit]);

  // Duplicate events for seamless looping
  const marqueeEvents = [...events, ...events];

  return (
    <div className={styles.marqueeContainer}>
      {events.length === 0 ? (
        <div style={{ color: '#aaa', pointerEvents: 'auto' }}>No events yet.</div>
      ) : (
        <div className={styles.marquee} ref={marqueeRef}>
          {marqueeEvents.map((ev, idx) => (
            <span key={ev._id + '-' + idx} className={styles.marqueeEvent}>
              <span style={{ fontSize: 20, marginRight: 4 }}>{typeIcon[ev.type] || "📝"}</span>
              <span>{ev.message}</span>
              <Link href={`/story/${ev.storyId}/leaderboard`} style={{ color: "#fbbf24", fontWeight: 600, fontSize: 15, marginLeft: 8 }} title="View leaderboard">🏅</Link>
              <span style={{ color: "#aaa", fontSize: 12, marginLeft: 8 }}>{new Date(ev.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
              <span className={styles.marqueeDivider}>|</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
} 