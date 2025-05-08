"use client";
import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { getProxiedImageUrl, Story } from "@/app/api/game/types";
import { LeaderboardUser } from './Leaderboard';

interface StoryGridProps {
  initialStories: Array<Story & {
    playerCount: number;
    totalArtifactsFound: number;
    killedCount: number;
  }>;
}

const placeholderImage = "/images/story-placeholder.png";

// Add pop-in animation CSS
const popInStyle = `
@keyframes popIn {
  0% { opacity: 0; transform: scale(0.8); }
  80% { opacity: 1; transform: scale(1.05); }
  100% { opacity: 1; transform: scale(1); }
}
.story-card-pop-in {
  animation: popIn 0.45s cubic-bezier(0.22, 1, 0.36, 1);
}
`;

// Skeleton card CSS
const skeletonStyle = `
@keyframes skeletonShimmer {
  0% { background-position: -600px 0; }
  100% { background-position: 600px 0; }
}
.story-card-skeleton {
  background: #23244aee;
  border-radius: 16px;
  border: 2.5px solid #3b82f6;
  box-shadow: 0 4px 24px 0 #3b82f633;
  padding: 24px;
  width: 320px;
  min-width: 320px;
  max-width: 320px;
  color: #f5f6fa;
  text-align: center;
  font-weight: 600;
  font-size: 1.1rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
  position: relative;
  overflow: hidden;
}
.story-card-skeleton-image {
  width: 160px;
  height: 100px;
  border-radius: 12px;
  margin-bottom: 16px;
  border: 2px solid #3b82f6;
  background: linear-gradient(90deg, #23244a 25%, #3b82f6 50%, #23244a 75%);
  background-size: 600px 100px;
  animation: skeletonShimmer 1.2s infinite linear;
}
.story-card-skeleton-line {
  width: 80%;
  height: 18px;
  border-radius: 8px;
  margin: 8px 0;
  background: linear-gradient(90deg, #23244a 25%, #3b82f6 50%, #23244a 75%);
  background-size: 600px 100px;
  animation: skeletonShimmer 1.2s infinite linear;
}
`;

// Winner ribbon CSS
const ribbonStyle = {
  position: 'absolute' as const,
  top: 12,
  right: -32,
  background: 'linear-gradient(90deg, #fbbf24 60%, #f59e42 100%)',
  color: '#23244a',
  fontWeight: 900,
  fontSize: 16,
  padding: '6px 32px',
  borderRadius: '16px 0 0 16px',
  boxShadow: '0 2px 8px #0003',
  zIndex: 2,
  letterSpacing: 1,
  transform: 'rotate(18deg)',
};

// Bump animation CSS
const bumpAnimStyle = `
@keyframes statBump {
  0% { transform: scale(1); }
  30% { transform: scale(1.25); }
  60% { transform: scale(0.95); }
  100% { transform: scale(1); }
}
.stat-bump {
  animation: statBump 0.45s cubic-bezier(0.22, 1, 0.36, 1);
}
`;

// Utility to clean up story titles (duplicated from backend for frontend use)
function cleanTitle(title: string): string {
  // Remove leading prefixes
  title = title.replace(/^(Story:|Game:|Title:|The Adventure of)\s*/i, '');
  // Remove anything in parentheses (byline-style)
  title = title.replace(/\s*\(.*?\)\s*/g, '');
  // Truncate at the first colon, if present
  const colonIdx = title.indexOf(":");
  if (colonIdx !== -1) title = title.slice(0, colonIdx);
  // Trim whitespace
  return title.trim();
}

export default function StoryGrid({ initialStories }: StoryGridProps) {
  const [stories, setStories] = useState(initialStories);
  const [newStoryIds, setNewStoryIds] = useState<Set<string>>(new Set());
  const announcedStoryIds = useRef(new Set(initialStories.map(s => s.id)));

  // Track previous stats for bump animation
  const [prevStats, setPrevStats] = useState<{ [id: string]: { playerCount: number; totalArtifactsFound: number; killedCount: number } }>({});
  const [bumpMap, setBumpMap] = useState<{ [id: string]: { player: boolean; artifact: boolean; killed: boolean } }>({});

  // Winner state: storyId -> boolean
  const [storyWinners, setStoryWinners] = useState<{ [storyId: string]: boolean }>({});

  useEffect(() => {
    // Inject animation style if not present
    if (!document.getElementById('story-pop-in-style')) {
      const style = document.createElement('style');
      style.id = 'story-pop-in-style';
      style.innerHTML = popInStyle + skeletonStyle + bumpAnimStyle;
      document.head.appendChild(style);
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/game/stories");
        if (!res.ok) return;
        const data = await res.json();
        if (Array.isArray(data)) {
          setStories(prev => {
            const prevMap = new Map(prev.map(s => [s.id, s]));
            const merged = data.map((s: Story & { playerCount?: number; totalArtifactsFound?: number; killedCount?: number; image?: string }) => {
              const prevStory = prevMap.get(s.id);
              return {
                ...s,
                image: s.image || prevStory?.image || placeholderImage,
                playerCount: s.playerCount ?? prevStory?.playerCount ?? 0,
                totalArtifactsFound: s.totalArtifactsFound ?? prevStory?.totalArtifactsFound ?? 0,
                killedCount: s.killedCount ?? prevStory?.killedCount ?? 0,
              };
            });
            // Find new stories
            const prevIds = new Set(prev.map(s => s.id));
            const newStories = data.filter((s: Story) => !prevIds.has(s.id));
            if (newStories.length > 0) {
              newStories.forEach((s: Story) => {
                if (!announcedStoryIds.current.has(s.id)) {
                  announcedStoryIds.current.add(s.id);
                }
              });
              // Mark new story IDs for animation
              setNewStoryIds(ids => {
                const updated = new Set(ids);
                newStories.forEach(s => updated.add(s.id));
                return updated;
              });
            }
            return merged;
          });
        }
      } catch {
        // Optionally handle error
      }
    }, 7000);
    return () => clearInterval(interval);
  }, []);

  // Remove pop-in class after animation
  useEffect(() => {
    if (newStoryIds.size === 0) return;
    const timeout = setTimeout(() => {
      setNewStoryIds(new Set());
    }, 600); // Animation duration + buffer
    return () => clearTimeout(timeout);
  }, [newStoryIds]);

  // Detect stat increases and trigger bump
  useEffect(() => {
    setStories(prev => {
      const newBumpMap: typeof bumpMap = {};
      const newPrevStats: typeof prevStats = { ...prevStats };
      for (const story of prev) {
        const prevStat = prevStats[story.id];
        newBumpMap[story.id] = {
          player:
            prevStat === undefined
              ? story.playerCount > 0
              : story.playerCount > prevStat.playerCount,
          artifact:
            prevStat === undefined
              ? story.totalArtifactsFound > 0
              : story.totalArtifactsFound > prevStat.totalArtifactsFound,
          killed:
            prevStat === undefined
              ? story.killedCount > 0
              : story.killedCount > prevStat.killedCount,
        };
        newPrevStats[story.id] = {
          playerCount: story.playerCount,
          totalArtifactsFound: story.totalArtifactsFound,
          killedCount: story.killedCount,
        };
      }
      setBumpMap(newBumpMap);
      setTimeout(() => setBumpMap({}), 500); // Remove bump after animation
      setPrevStats(newPrevStats);
      return prev;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stories]);

  // Fetch winner info for each story
  useEffect(() => {
    async function fetchWinners() {
      const winnerMap: { [storyId: string]: boolean } = {};
      await Promise.all(
        stories.map(async (story) => {
          try {
            const res = await fetch(`/api/leaderboard?storyId=${story.id}`);
            if (!res.ok) return;
            const data = await res.json();
            winnerMap[story.id] = Array.isArray(data) && data.some((u: LeaderboardUser) => u.isWinner);
          } catch {
            // ignore
          }
        })
      );
      setStoryWinners(winnerMap);
    }
    if (stories.length > 0) fetchWinners();
  }, [stories]);

  return (
    <div
      style={{
        width: '100%',
        maxWidth: 1200,
        margin: '0 auto',
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 32,
        marginTop: 32,
      }}
    >
      {stories.length === 0 && (
        <div style={{ color: '#aaa', textAlign: 'center', width: '100%' }}>No stories available yet.</div>
      )}
      {stories.map((story, index) => {
        const isSkeleton = !story.image;
        if (isSkeleton) {
          return (
            <div
              key={story.id}
              className="story-card-skeleton"
              style={{ display: 'flex', justifyContent: 'center', flex: '0 1 320px', minWidth: 320, maxWidth: 320 }}
              data-testid="story-skeleton"
            >
              <div className="story-card-skeleton-image" />
              <div className="story-card-skeleton-line" style={{ width: '60%' }} />
              <div className="story-card-skeleton-line" style={{ width: '80%' }} />
              <div className="story-card-skeleton-line" style={{ width: '40%' }} />
              <div style={{ marginTop: 24, color: '#a7a7ff', fontSize: 16 }}>Loading…</div>
            </div>
          );
        }
        return (
          <Link
            key={story.id}
            href={`/story/${story.id}`}
            style={{ textDecoration: 'none', display: 'flex', justifyContent: 'center', flex: '0 1 320px', minWidth: 320, maxWidth: 320 }}
          >
            <div
              className={newStoryIds.has(story.id) ? 'story-card-pop-in' : ''}
              style={{
                background: '#23244aee',
                borderRadius: 16,
                border: '2.5px solid #3b82f6',
                boxShadow: '0 4px 24px 0 #3b82f633',
                padding: 24,
                width: 320,
                color: '#f5f6fa',
                textAlign: 'center',
                fontWeight: 600,
                fontSize: '1.1rem',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                transition: 'box-shadow 0.2s, border 0.2s',
                cursor: 'pointer',
                height: 420,
                minWidth: 320,
                maxWidth: 320,
                boxSizing: 'border-box',
                position: 'relative',
              }}
            >
              {/* Winner Ribbon */}
              {storyWinners[story.id] && (
                <div style={ribbonStyle} title="This story has a winner!">
                  🏆 Winner!
                </div>
              )}
              {story.image && story.image.trim() ? (
                <Image 
                  src={getProxiedImageUrl(story.image)}
                  alt={story.title}
                  width={160}
                  height={100}
                  priority={index === 0}
                  style={{ 
                    borderRadius: 12, 
                    marginBottom: 16, 
                    objectFit: 'cover', 
                    width: 160, 
                    height: 'auto', // maintain aspect ratio
                  }}
                  onError={e => {
                    const target = e.target as HTMLImageElement;
                    if (target.src !== placeholderImage) target.src = placeholderImage;
                  }}
                />
              ) : (
                <Image
                  src={placeholderImage}
                  alt="Story Placeholder"
                  width={160}
                  height={100}
                  priority={index === 0}
                  style={{
                    borderRadius: 12,
                    marginBottom: 16,
                    objectFit: 'cover',
                    filter: 'grayscale(1)',
                    width: 160,
                    height: 'auto', // maintain aspect ratio
                  }}
                />
              )}
              <div style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 8 }}>{cleanTitle(story.title)}</div>
              <div
                style={{
                  fontSize: '1rem',
                  color: '#a78bfa',
                  marginBottom: 16,
                  flexGrow: 1,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxHeight: '2.6em', // ~2 lines
                  width: '100%',
                  minHeight: 48,
                }}
                title={story.description}
              >
                {story.description.length > 100
                  ? story.description.slice(0, 100) + '…'
                  : story.description}
              </div>
              <div style={{
                fontSize: '0.9rem', 
                color: '#cbd5e1',
                marginTop: 'auto',
                paddingTop: 12,
                borderTop: '1px solid #4a5568',
                width: '100%',
                display: 'flex',
                justifyContent: 'space-around'
              }}>
                <span className={bumpMap[story.id]?.player ? 'stat-bump' : ''}>👤 {story.playerCount}</span>
                <span className={bumpMap[story.id]?.artifact ? 'stat-bump' : ''}>💎 {story.totalArtifactsFound}</span>
                <span className={bumpMap[story.id]?.killed ? 'stat-bump' : ''}>💀 {story.killedCount}</span>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
} 