import React from 'react';
import Image from 'next/image';

interface UserDetailCardProps {
  user: {
    id: string;
    inventory: string[];
    reachedGoal: boolean;
    room: string;
  };
  onClose: () => void;
  story: {
    title: string;
    artifacts: string[];
  };
}

const avatarUrl = (userId: string) =>
  `https://api.dicebear.com/7.x/pixel-art/png?seed=${encodeURIComponent(userId)}`;

export default function UserDetailCard({ user, onClose, story }: UserDetailCardProps) {
  // Close on background click, but not card click
  const handleBackgroundClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

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
          <Image
            src={avatarUrl(user.id)}
            alt={`${user.id}'s avatar`}
            width={80}
            height={80}
            style={{
              borderRadius: '8px',
              background: '#222',
              border: '2px solid #3b82f6',
            }}
          />
          <div style={{ marginLeft: '16px', flex: 1 }}>
            <h2 style={{ color: '#3b82f6', margin: '0 0 4px 0', fontSize: '1.5rem' }}>
              {user.id}
            </h2>
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
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {user.inventory.length === 0 ? (
              <div style={{ color: '#666' }}>No artifacts collected yet</div>
            ) : (
              user.inventory.map((item) => (
                <div
                  key={item}
                  style={{
                    background: '#2a2a2a',
                    padding: '6px 12px',
                    borderRadius: '4px',
                    color: '#fff',
                    fontSize: '0.9rem',
                  }}
                >
                  {item}
                </div>
              ))
            )}
          </div>
        </div>

        <div style={{ marginTop: '20px' }}>
          <h3 style={{ color: '#06b6d4', margin: '0 0 12px 0' }}>Progress</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ flex: 1, height: '8px', background: '#2a2a2a', borderRadius: '4px' }}>
              <div
                style={{
                  width: `${(user.inventory.length / story.artifacts.length) * 100}%`,
                  height: '100%',
                  background: '#3b82f6',
                  borderRadius: '4px',
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
            <div style={{ color: '#fff', fontSize: '0.9rem' }}>
              {user.inventory.length}/{story.artifacts.length}
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