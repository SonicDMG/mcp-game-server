"use client";
import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";

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
  const [highlighted, setHighlighted] = useState<Set<string>>(new Set());
  const prevEventIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    let isMounted = true;
    const fetchEvents = async () => {
      try {
        const res = await fetch(`/api/game/events?storyId=${storyId}&limit=${limit}`);
        if (!res.ok) return;
        const data = await res.json();
        if (Array.isArray(data)) {
          if (isMounted) {
            // Highlight new events
            const newIds = data.filter(e => !prevEventIds.current.has(e._id)).map(e => e._id);
            setEvents(data);
            if (newIds.length > 0) {
              setHighlighted(new Set(newIds));
              setTimeout(() => setHighlighted(new Set()), 1200);
            }
            prevEventIds.current = new Set(data.map(e => e._id));
          }
        }
      } catch {}
    };
    fetchEvents();
    const interval = setInterval(fetchEvents, 4000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [storyId, limit]);

  return (
    <div style={{ minWidth: 260, maxWidth: 320, marginLeft: 24, padding: 8, background: "#181a2b", borderRadius: 12, boxShadow: "0 2px 8px #0002", fontSize: 14, height: 80, overflow: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ fontWeight: 700, color: "#fbbf24", marginBottom: 4, fontSize: 15 }}>Events</div>
      {events.length === 0 && <div style={{ color: "#aaa" }}>No events yet.</div>}
      {events.map(ev => (
        <div
          key={ev._id}
          className={highlighted.has(ev._id) ? "event-feed-highlight" : ""}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: highlighted.has(ev._id) ? "#fbbf2433" : undefined,
            borderRadius: 8,
            padding: "2px 6px",
            transition: "background 0.3s",
          }}
        >
          <span style={{ fontSize: 18 }}>{typeIcon[ev.type] || "📝"}</span>
          <span style={{ flex: 1 }}>{ev.message}</span>
          <Link href={`/story/${ev.storyId}/leaderboard`} style={{ color: "#3b82f6", fontWeight: 600, fontSize: 13, marginLeft: 4 }} title="View leaderboard">🏅</Link>
          <span style={{ color: "#888", fontSize: 11, marginLeft: 6 }}>{new Date(ev.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
        </div>
      ))}
      <style>{`
        .event-feed-highlight {
          animation: eventFeedPop 0.7s cubic-bezier(0.22, 1, 0.36, 1);
        }
        @keyframes eventFeedPop {
          0% { background: #fbbf24cc; transform: scale(0.95); }
          60% { background: #fbbf24cc; transform: scale(1.05); }
          100% { background: #181a2b; transform: scale(1); }
        }
      `}</style>
    </div>
  );
} 