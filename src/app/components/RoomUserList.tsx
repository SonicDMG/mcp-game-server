import React from 'react';
import Image from 'next/image';
import { getProxiedImageUrl } from '../api/game/types';
import { LeaderboardUser } from './Leaderboard';
import type { Location as GameLocation } from '../api/game/types';
import styles from './WinnerBanner.module.css';

const avatarUrl = (userId: string) =>
  `https://api.dicebear.com/7.x/pixel-art/png?seed=${encodeURIComponent(userId)}`;

const color = {
  user: '#06b6d4',
  artifact: '#fff',
};

interface RoomUserListProps {
  users: LeaderboardUser[];
  loc: GameLocation;
  setSelectedUser: (user: LeaderboardUser) => void;
  setUserListModal: (modal: { room: string; users: LeaderboardUser[] } | null) => void;
}

const RoomUserList: React.FC<RoomUserListProps> = ({ users, loc, setSelectedUser, setUserListModal }) => {
  if (users.length === 0) return <span style={{ color: '#888' }}>(no users)</span>;
  const maxToShow = 3;
  const shown = users.slice(0, maxToShow);
  const overflow = users.length - maxToShow;
  return (
    <>
      {shown.map((user) => (
        <span key={user.id} style={{ display: 'flex', alignItems: 'center', marginBottom: 2, width: '100%' }}>
          <span className={user.status === 'killed' ? styles.killedAvatarWrapper : undefined} style={{ display: 'inline-block' }}>
            <Image
              src={getProxiedImageUrl(avatarUrl(user.id))}
              alt="avatar"
              width={20}
              height={20}
              style={{ borderRadius: 4, marginRight: 4, background: '#222', cursor: 'pointer' }}
              onClick={() => setSelectedUser(user)}
              unoptimized
            />
            {user.status === 'killed' && (
              <span className={styles.killedSkullOverlay} style={{ fontSize: '1.2rem', color: '#ff0000' }} role="img" aria-label="eliminated">&times;</span>
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
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              flex: 1,
            }}
            title={user.id}
            onClick={() => setSelectedUser(user)}
          >
            {user.id}
          </span>
          <span style={{ color: color.artifact, marginLeft: 2, fontWeight: 400, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 2 }}>
            <span role="img" aria-label="items">🎒</span> {user.inventory.length}
          </span>
        </span>
      ))}
      {overflow > 0 && (
        <span
          key={`overflow-${loc.id}`}
          style={{ color: '#a7a7ff', cursor: 'pointer', fontWeight: 600, marginTop: 2 }}
          onClick={() => setUserListModal({ room: loc.name, users })}
        >
          +{overflow} more
        </span>
      )}
    </>
  );
};

export default RoomUserList; 