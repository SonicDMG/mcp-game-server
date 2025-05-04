import React from 'react';
import Image from 'next/image';
import { getProxiedImageUrl } from '../api/game/types';
import { LeaderboardUser } from '../story/[id]/Leaderboard';
import styles from './WinnerBanner.module.css';

const color = {
  heading: '#3b82f6',
  user: '#06b6d4',
  artifact: '#fff',
};

interface UserListModalProps {
  room: string;
  users: LeaderboardUser[];
  setSelectedUser: (user: LeaderboardUser) => void;
  onClose: () => void;
}

const avatarUrl = (userId: string) =>
  `https://api.dicebear.com/7.x/pixel-art/png?seed=${encodeURIComponent(userId)}`;

const UserListModal: React.FC<UserListModalProps> = ({ room, users, setSelectedUser, onClose }) => (
  <div
    style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      background: 'rgba(0,0,0,0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000,
    }}
    onClick={onClose}
  >
    <div
      style={{ background: '#222', borderRadius: 12, padding: 24, minWidth: 320, maxWidth: 400, maxHeight: '80vh', overflowY: 'auto', boxShadow: '0 8px 32px #000a', position: 'relative' }}
      onClick={e => e.stopPropagation()}
    >
      <h3 style={{ color: color.heading, marginBottom: 12, textAlign: 'center' }}>Users in {room}</h3>
      {users.map((user) => (
        <div key={user.id} style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
          <span className={user.status === 'killed' ? styles.killedAvatarWrapper : undefined} style={{ display: 'inline-block' }}>
            <Image
              src={getProxiedImageUrl(avatarUrl(user.id))}
              alt="avatar"
              width={24}
              height={24}
              style={{ borderRadius: 4, marginRight: 8, background: '#222', cursor: 'pointer' }}
              onClick={() => setSelectedUser(user)}
              unoptimized
            />
            {user.status === 'killed' && (
              <span className={styles.killedSkullOverlay} style={{ fontSize: '1.5rem', color: '#ff0000' }} role="img" aria-label="eliminated">&times;</span>
            )}
          </span>
          <span
            style={{
              color: color.user,
              fontWeight: 600,
              cursor: 'pointer',
              textDecoration: 'underline',
              textDecorationStyle: 'dotted',
              textDecorationColor: 'rgba(59, 130, 246, 0.4)',
              marginRight: 4,
            }}
            onClick={() => setSelectedUser(user)}
          >
            {user.id}
          </span>
          <span style={{ color: color.artifact, marginLeft: 2, fontWeight: 400 }}>
            ({user.inventory.length} Artifact{user.inventory.length === 1 ? '' : 's'})
          </span>
        </div>
      ))}
      <button
        onClick={onClose}
        style={{
          position: 'absolute',
          top: 8,
          right: 8,
          background: 'rgba(0,0,0,0.7)',
          color: '#fff',
          border: 'none',
          borderRadius: 6,
          padding: '6px 12px',
          fontSize: 18,
          cursor: 'pointer',
          zIndex: 1001,
        }}
      >
        ✕
      </button>
    </div>
  </div>
);

export default UserListModal; 