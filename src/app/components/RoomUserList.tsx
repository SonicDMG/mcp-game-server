import React from 'react';
import Image from 'next/image';
import { getProxiedImageUrl } from '../api/game/types';
import { LeaderboardUser } from '../AsciiLeaderboard';
import type { Location as GameLocation } from '../api/game/types';

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
          <Image
            src={getProxiedImageUrl(avatarUrl(user.id))}
            alt="avatar"
            width={20}
            height={20}
            style={{ borderRadius: 4, marginRight: 4, background: '#222', cursor: 'pointer' }}
            onClick={() => setSelectedUser(user)}
            unoptimized
          />
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
              maxWidth: 70,
            }}
            onClick={() => setSelectedUser(user)}
          >
            {user.id}
          </span>
          <span style={{ color: color.artifact, marginLeft: 2, fontWeight: 400, whiteSpace: 'nowrap' }}>
            ({user.inventory.length} Artifact{user.inventory.length === 1 ? '' : 's'})
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