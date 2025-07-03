"use client";
import React, { useState } from "react";
import { useQuery } from '@tanstack/react-query';
import AppFooter from './components/AppFooter';
import AppHeader from './components/AppHeader';
import StoryGrid from './components/StoryGrid';
import EventFeed from './components/EventFeed';
import HeroSection from './components/HeroSection';
import mainContentStyles from './components/MainContent.module.css';
import storyGridStyles from './components/StoryGrid.module.css';
import { Story } from "@/app/api/game/types";

const STORIES_PER_PAGE = 5;

export default function LandingPage() {
  const [page, setPage] = useState(1);
  const {
    data,
    isLoading,
    isError,
    error
  } = useQuery<{ stories: (Story & { playerCount: number; totalArtifactsFound: number; killedCount: number; })[]; total: number }, Error>({
    queryKey: ["stories", page],
    queryFn: async () => {
      const res = await fetch(`/api/game/stories?page=${page}&limit=${STORIES_PER_PAGE}`);
      if (!res.ok) throw new Error("Failed to fetch stories");
      return res.json();
    },
    refetchOnWindowFocus: true,
    refetchInterval: 30000, // 30 seconds
    placeholderData: (prev) => prev,
  });

  const stories = data?.stories ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / STORIES_PER_PAGE);

  return (
    <div className="relative min-h-screen">
      <AppHeader breadcrumbs={[{ label: 'Home', href: '/' }]} />
      <div>
        <main className={`hud-frame ${mainContentStyles.mainContent} landing-gradient-bg`}>
          <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
            <HeroSection />
            <EventFeed storyId="all" />
            <div id="stories">
              {isError ? (
                <div className="text-red-500 text-center col-span-full">{(error as Error)?.message || "Could not load story details. Please try again later."}</div>
              ) : isLoading ? (
                <div className="text-center py-8 text-lg text-blue-400">Loading stories…</div>
              ) : (
                <>
                  <StoryGrid initialStories={stories} />
                  <div className={storyGridStyles.paginationBar}>
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      style={{ padding: '6px 16px', borderRadius: 6, border: '1px solid #444', background: page === 1 ? '#222' : '#2d2d5a', color: '#fff', cursor: page === 1 ? 'not-allowed' : 'pointer' }}
                    >Prev</button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                      <button
                        key={p}
                        onClick={() => setPage(p)}
                        disabled={p === page}
                        style={{ padding: '6px 12px', borderRadius: 6, border: p === page ? '2px solid #3b82f6' : '1px solid #444', background: p === page ? '#3b82f6' : '#23244a', color: '#fff', fontWeight: p === page ? 700 : 400, cursor: p === page ? 'default' : 'pointer' }}
                      >{p}</button>
                    ))}
                    <button
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages || totalPages === 0}
                      style={{ padding: '6px 16px', borderRadius: 6, border: '1px solid #444', background: page === totalPages || totalPages === 0 ? '#222' : '#2d2d5a', color: '#fff', cursor: page === totalPages || totalPages === 0 ? 'not-allowed' : 'pointer' }}
                    >Next</button>
                  </div>
                  <span className={storyGridStyles.paginationCount}>
                    Page {page} of {totalPages || 1} ({total} stories)
                  </span>
                </>
              )}
            </div>
          </div>
        </main>
      </div>
      <AppFooter />
    </div>
  );
}
