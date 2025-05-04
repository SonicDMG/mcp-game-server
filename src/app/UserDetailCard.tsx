import React from 'react';
import Image from 'next/image';
import { getProxiedImageUrl, GameItem } from './api/game/types';
import styles from './components/WinnerBanner.module.css';

interface UserDetailCardProps {
  user: {
    id: string;
    inventory: string[];
    reachedGoal: boolean;
    room: string;
    status?: 'playing' | 'winner' | 'killed';
  };
  onClose: () => void;
  story: {
    title: string;
    requiredArtifacts?: string[];
  };
  items: GameItem[];
  setZoomedItem?: (item: { image: string; name: string; description: string }) => void;
}

const avatarUrl = (userId: string) =>
  `https://api.dicebear.com/7.x/pixel-art/png?seed=${encodeURIComponent(userId)}`;

export default function UserDetailCard({ user, onClose, story, items, setZoomedItem }: UserDetailCardProps) {
  // Close on background click, but not card click
  const handleBackgroundClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Calculate total required artifacts, defaulting to 0 if undefined/empty
  const totalRequired = story.requiredArtifacts?.length ?? 0;
  // Only count required artifacts in the user's inventory
  const requiredCollected = user.inventory.filter(itemId => story.requiredArtifacts?.includes(itemId));
  // Prevent division by zero for progress bar width
  const progressPercentage = totalRequired > 0 ? (requiredCollected.length / totalRequired) * 100 : 0;

  return (
    <div
      className="user-detail-overlay"
      onClick={handleBackgroundClick}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        backdropFilter: 'blur(3px)',
      }}
    >
      <div
        className="user-detail-card"
        style={{
          background: '#1a1a1a',
          borderRadius: '12px',
          padding: '24px',
          width: '90%',
          maxWidth: '400px',
          border: '1px solid #3b82f6',
          boxShadow: '0 0 20px rgba(59, 130, 246, 0.2)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: '20px' }}>
          <div className={user.status === 'killed' ? styles.killedAvatarWrapper : undefined}>
            <Image
              src={getProxiedImageUrl(avatarUrl(user.id))}
              alt={`${user.id}'s avatar`}
              width={80}
              height={80}
              style={{
                borderRadius: '8px',
                background: '#222',
                border: '2px solid #3b82f6',
              }}
            />
            {user.status === 'killed' && (
              <span className={styles.killedSkullOverlay} style={{ fontSize: '5rem', color: '#ff0000' }} role="img" aria-label="eliminated">&times;</span>
            )}
          </div>
          <div style={{ marginLeft: '16px', flex: 1, minWidth: 0 }}>
            <h2 style={{ color: '#3b82f6', margin: '0 0 4px 0', fontSize: '1.5rem',
              maxWidth: '100%',
              display: 'block',
              wordBreak: 'break-all',
            }}
            title={user.id}
            >
              {user.id}
            </h2>
            {user.status === 'killed' && (
              <div style={{ color: '#ff0000', fontWeight: 900, fontSize: '1.1rem', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4 }}>
                DEAD
              </div>
            )}
            <div style={{ color: '#a78bfa', fontSize: '1.1rem' }}>
              Current Room: {user.room}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#666',
              fontSize: '1.5rem',
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            ×
          </button>
        </div>

        <div style={{ marginTop: '20px' }}>
          <h3 style={{ color: '#06b6d4', margin: '0 0 12px 0' }}>Inventory</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px 12px', alignItems: 'flex-start', justifyContent: 'flex-start', minHeight: 56 }}>
            {user.inventory.length === 0 ? (
              <div style={{ color: '#666' }}>No artifacts collected yet</div>
            ) : (
              user.inventory.map((itemId, idx) => {
                const itemObj = items.find(i => i.id === itemId);
                return (
                  <div
                    key={itemId + '-' + idx}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'none', cursor: setZoomedItem && itemObj ? 'pointer' : 'default', minWidth: 56 }}
                    onClick={() => setZoomedItem && itemObj && setZoomedItem({
                      image: itemObj.image || '/images/item-placeholder.png',
                      name: itemObj.name || itemId,
                      description: itemObj.description || ''
                    })}
                  >
                    <Image
                      src={getProxiedImageUrl(itemObj?.image || '/images/item-placeholder.png')}
                      alt={itemObj?.name || itemId}
                      width={40}
                      height={40}
                      style={{ borderRadius: 6, background: '#222', marginBottom: 2, border: '2px solid #3b82f6' }}
                      title={itemObj?.name || itemId}
                      unoptimized
                    />
                    <span style={{ color: '#a7a7ff', fontSize: 11, maxWidth: 80, textAlign: 'center', wordBreak: 'break-word' }} title={itemObj?.name || itemId}>
                      {itemObj?.name || itemId}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div style={{ marginTop: '20px' }}>
          <h3 style={{ color: '#06b6d4', margin: '0 0 12px 0' }}>Required Artifact Progress</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ flex: 1, height: '8px', background: '#2a2a2a', borderRadius: '4px' }}>
              <div
                style={{
                  width: `${progressPercentage}%`,
                  height: '100%',
                  background: '#3b82f6',
                  borderRadius: '4px',
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
            <div style={{ color: '#fff', fontSize: '0.9rem' }}>
              {requiredCollected.length}/{totalRequired}
            </div>
          </div>
        </div>

        {user.reachedGoal && (
          <div
            style={{
              marginTop: '20px',
              padding: '12px',
              background: '#2a2a2a',
              borderRadius: '8px',
              color: '#10b981',
              textAlign: 'center',
              fontWeight: 600,
            }}
          >
            🏆 Reached the Goal!
          </div>
        )}
      </div>
    </div>
  );
} 