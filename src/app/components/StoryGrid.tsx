"use client";
import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { getProxiedImageUrl, Story } from "@/app/api/game/types";
import { LeaderboardUser } from './Leaderboard';
import styles from './StoryGrid.module.css';

interface StoryGridProps {
  initialStories: Array<Story & {
    playerCount: number;
    totalArtifactsFound: number;
    killedCount: number;
  }>;
}

// Type for the previous stats map
interface StoryStats {
  playerCount: number;
  totalArtifactsFound: number;
  killedCount: number;
}

// Type for the bump map
interface BumpMap {
  player: boolean;
  artifact: boolean;
  killed: boolean;
}

// Type for the previous stats map
interface StoryStats {
  playerCount: number;
  totalArtifactsFound: number;
  killedCount: number;
}

// Type for the bump map
interface BumpMap {
  player: boolean;
  artifact: boolean;
  killed: boolean;
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
  background: #1a1b3d;
  border-radius: 12px;
  border: 1px solid #2d2d5a;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  padding: 20px;
  width: 100%;
  max-width: 800px;
  color: #f5f6fa;
  text-align: left;
  font-weight: 600;
  font-size: 1.1rem;
  display: flex;
  flex-direction: column;
  min-height: 200px;
  box-sizing: border-box;
  position: relative;
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
  const [stories, setStories] = useState<Array<Story & StoryStats>>(initialStories);
  const [newStoryIds, setNewStoryIds] = useState<Set<string>>(new Set());
  const announcedStoryIds = useRef(new Set(initialStories.map(s => s.id)));

  // Track previous stats for bump animation
  const [prevStats, setPrevStats] = useState<{ [id: string]: StoryStats }>({});
  const [bumpMap, setBumpMap] = useState<{ [id: string]: BumpMap }>({});

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
      const newPrevStats: { [id: string]: StoryStats } = { ...prevStats };
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
    <div className={styles.contentContainer}>
      {stories.length === 0 && (
        <div className={styles.noStoriesMsg}>No stories available yet.</div>
      )}
      {stories.map((story, index) => {
        const isSkeleton = !story.image;
        if (isSkeleton) {
          return (
            <div
              key={story.id}
              className={`${styles.storyCardSkeletonWrapper} story-card-skeleton`}
              data-testid="story-skeleton"
            >
              <div className="story-card-skeleton-image" />
              <div className="story-card-skeleton-line" />
              <div className="story-card-skeleton-line" />
              <div className="story-card-skeleton-line" />
              <div className={styles.loadingMsg}>Loading…</div>
            </div>
          );
        }
        return (
          <Link
            key={story.id}
            href={`/story/${story.id}`}
            className={styles.storyCardWrapper}
          >
            <div className={styles.storyCardContent + (newStoryIds.has(story.id) ? ' story-card-pop-in' : '')}>
              <div className={styles.storyCardImageContainer}>
                {storyWinners[story.id] && (
                  <div className={styles.winnerRibbon} title="This story has a winner!">
                    🏆 Winner!
                  </div>
                )}
                {story.image && story.image.trim() ? (
                  <Image 
                    src={getProxiedImageUrl(story.image)}
                    alt={story.title}
                    width={400}
                    height={300}
                    quality={90}
                    sizes="(max-width: 768px) 100vw, 400px"
                    priority={index === 0}
                    className={styles.storyCardImage}
                    onError={e => {
                      const target = e.target as HTMLImageElement;
                      if (target.src !== placeholderImage) target.src = placeholderImage;
                    }}
                  />
                ) : (
                  <Image
                    src={placeholderImage}
                    alt="Story Placeholder"
                    width={200}
                    height={150}
                    priority={index === 0}
                    className={styles.storyCardImage}
                    style={{
                      filter: 'grayscale(1)',
                      opacity: 0.7,
                    }}
                  />
                )}
              </div>
              <div className={styles.storyCardText}>
                <h3 className={styles.storyCardTitle}>
                  {cleanTitle(story.title)}
                </h3>
                {story.description && (
                  <p className={styles.storyCardDescription}>
                    {story.description}
                  </p>
                )}
                <div className={styles.storyCardStats}>
                  <div className={`${styles.statItem} ${bumpMap[story.id]?.player ? styles.bump : ''}`}>
                    <span className={styles.statIcon}>👤</span>
                    <span className={styles.statValue}>{story.playerCount}</span>
                    <span className={styles.statLabel}>Players</span>
                  </div>
                  <div className={`${styles.statItem} ${bumpMap[story.id]?.artifact ? styles.bump : ''}`}>
                    <span className={styles.statIcon}>💎</span>
                    <span className={styles.statValue}>{story.totalArtifactsFound}</span>
                    <span className={styles.statLabel}>Artifacts</span>
                  </div>
                  <div className={`${styles.statItem} ${bumpMap[story.id]?.killed ? styles.bump : ''}`}>
                    <span className={styles.statIcon}>💀</span>
                    <span className={styles.statValue}>{story.killedCount}</span>
                    <span className={styles.statLabel}>Killed</span>
                  </div>
                </div>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
} 