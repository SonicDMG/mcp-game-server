"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { toast } from "react-toastify";
import { getProxiedImageUrl, Story } from "@/app/api/game/types";

interface StoryGridProps {
  initialStories: Array<Story & {
    playerCount: number;
    totalArtifactsFound: number;
    killedCount: number;
  }>;
}

const placeholderImage = "https://placehold.co/320x200/23244a/3b82f6.png?text=Story+Image";

export default function StoryGrid({ initialStories }: StoryGridProps) {
  const [stories, setStories] = useState(initialStories);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/game/stories");
        if (!res.ok) return;
        const data = await res.json();
        if (Array.isArray(data)) {
          setStories(prev => {
            const prevMap = new Map(prev.map(s => [s.id, s]));
            const merged = data.map((s: Story & { playerCount: number; totalArtifactsFound: number; killedCount: number }) => {
              const prevStory = prevMap.get(s.id);
              return {
                ...s,
                image: s.image || prevStory?.image || placeholderImage,
                playerCount: s.playerCount ?? prevStory?.playerCount ?? 0,
                totalArtifactsFound: s.totalArtifactsFound ?? prevStory?.totalArtifactsFound ?? 0,
                killedCount: s.killedCount ?? prevStory?.killedCount ?? 0,
              };
            });
            const prevIds = new Set(prev.map(s => s.id));
            const newStories = data.filter((s: Story) => !prevIds.has(s.id));
            if (newStories.length > 0) {
              newStories.forEach((s: Story) => {
                toast.success(`New story added: ${s.title}`);
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

  return (
    <div style={{
      width: '100%',
      maxWidth: 900,
      margin: '0 auto',
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
      gap: 32,
      marginTop: 32
    }}>
      {stories.length === 0 && (
        <div style={{ color: '#aaa', textAlign: 'center', gridColumn: '1 / -1' }}>No stories available yet.</div>
      )}
      {stories.map((story, index) => (
        <Link key={story.id} href={`/story/${story.id}`} style={{ textDecoration: 'none', display: 'flex' }}>
          <div style={{
            background: '#23244aee',
            borderRadius: 16,
            border: '2.5px solid #3b82f6',
            boxShadow: '0 4px 24px 0 #3b82f633',
            padding: 24,
            width: '100%',
            color: '#f5f6fa',
            textAlign: 'center',
            fontWeight: 600,
            fontSize: '1.1rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            transition: 'box-shadow 0.2s, border 0.2s',
            cursor: 'pointer',
            height: '100%'
          }}>
            <Image 
              src={getProxiedImageUrl(story.image || placeholderImage)} 
              alt={story.title} 
              width={160} 
              height={100} 
              priority={index === 0}
              style={{ 
                borderRadius: 12, 
                marginBottom: 16, 
                objectFit: 'cover', 
              }} 
            />
            <div style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 8 }}>{story.title}</div>
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
              <span>👤 {story.playerCount}</span>
              <span>💎 {story.totalArtifactsFound}</span>
              <span>💀 {story.killedCount}</span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
} 