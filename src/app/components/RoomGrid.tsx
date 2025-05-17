import React, { useMemo } from 'react';
import Image from 'next/image';
import { getProxiedImageUrl } from '../api/game/types';
import type { Location as GameLocation } from '../api/game/types';
import styles from './RoomGrid.module.css';

export interface LeaderboardUser {
  id: string;
  inventory: string[];
  reachedGoal: boolean;
  room: string;
  currentRoomId?: string;
  username?: string;
  displayName?: string;
  name?: string;
  isWinner?: boolean;
  status?: 'playing' | 'winner' | 'killed';
}

interface ExitInfo {
  id: string;
  name: string;
  image: string;
  direction: string;
}

interface ExitInfoResult {
  exits: ExitInfo[];
  isTerminal: boolean;
}

interface RoomGridProps {
  rooms: GameLocation[];
  users: LeaderboardUser[];
  goalRoom?: string;
  setZoomedImage: (img: string, name: string, description: string, roomId: string) => void;
  setSelectedUser: (user: LeaderboardUser) => void;
  setUserListModal: (modal: { room: string; users: LeaderboardUser[] } | null) => void;
  storyId: string;
}

const ROOM_IMAGE_PLACEHOLDER = "/images/room-placeholder.png";

// Default room thumbnail if no image is provided
const DEFAULT_ROOM_IMAGE = '/default-room-thumbnail.jpg';

const RoomGrid: React.FC<RoomGridProps> = ({
  rooms,
  users,
  goalRoom,
  setZoomedImage,
  setSelectedUser,
  setUserListModal,
  storyId,
}) => {
  // Get arrow character for direction
  const getDirectionArrow = (direction: string) => {
    switch (direction.toLowerCase()) {
      case 'north':
        return '↑';
      case 'south':
        return '↓';
      case 'east':
        return '→';
      case 'west':
        return '←';
      case 'northeast':
        return '↗';
      case 'northwest':
        return '↖';
      case 'southeast':
        return '↘';
      case 'southwest':
        return '↙';
      default:
        return '•';
    }
  };

  // Group users by room
  const usersByRoom = useMemo(() => {
    return users.reduce<Record<string, LeaderboardUser[]>>((acc, user) => {
      const roomId = user.room;
      if (!acc[roomId]) {
        acc[roomId] = [];
      }
      acc[roomId].push(user);
      return acc;
    }, {});
  }, [users]);

  // Generate avatar URL based on user ID
  const getAvatarUrl = (userId: string) => 
    `https://api.dicebear.com/7.x/pixel-art/png?seed=${encodeURIComponent(userId)}`;

  // Get display name for a user
  const getUserDisplayName = (user: LeaderboardUser): string => {
    // Check for any available name properties (some users might have these)
    return (user as any).name || (user as any).username || (user as any).displayName || user.id;
  };



  // Get room exit information
  const getExitInfo = (roomId: string): ExitInfoResult => {
    const room = rooms.find(r => r.id === roomId);
    if (!room) return {exits: [], isTerminal: false};
    
    // If no exits, it's a terminal room
    if (!room.exits?.length) {
      return {exits: [], isTerminal: true};
    }
    
    // Get all connected rooms
    const exits = room.exits.map((exit: any) => {
      const targetRoom = rooms.find(r => r.id === exit.targetLocationId);
      const roomName = targetRoom?.name || `Room ${exit.targetLocationId.slice(0, 4)}`;
      return {
        id: exit.targetLocationId,
        name: roomName,
        image: targetRoom?.image || DEFAULT_ROOM_IMAGE,
        direction: exit.direction || 'exit'
      };
    });
    
    return {
      exits,
      isTerminal: false
    };
  };

  // Handle room click to show zoomed image
  const handleRoomClick = (roomId: string) => {
    const room = rooms.find(r => r.id === roomId);
    if (room?.image) {
      setZoomedImage(
        getProxiedImageUrl(room.image) || ROOM_IMAGE_PLACEHOLDER,
        room.name || 'Unnamed Room',
        room.description || '',
        room.id || ''
      );
    }
  };

  // Handle user click to show user details
  const handleUserClick = (e: React.MouseEvent, user: LeaderboardUser) => {
    e.stopPropagation();
    setSelectedUser(user);
  };

  // Handle showing user list modal
  const handleShowUserList = (e: React.MouseEvent, roomId: string) => {
    e.stopPropagation();
    const roomUsers = usersByRoom[roomId] || [];
    if (roomUsers.length > 0) {
      setUserListModal({ 
        room: roomId || '', // Ensure room is always a string
        users: roomUsers 
      });
    }
  };

  return (
    <div className={styles.roomGridContainer}>
      <div className={styles.roomGrid}>
        {rooms.map((room) => {
          const roomUsers = usersByRoom[room.id] || [];
          const isGoalRoom = room.id === goalRoom;
          const exits = getExitInfo(room.id);
          
          return (
            <div 
              key={room.id} 
              className={`${styles.roomCard} ${isGoalRoom ? styles.goalRoom : ''}`}
              onClick={() => handleRoomClick(room.id)}
            >
              <div className={styles.roomHeader}>
                <h3 className={styles.roomName}>{room.name}</h3>
              </div>
              
              <div className={styles.roomContent}>
                <div className={styles.roomImageContainer}>
                  <Image
                    src={getProxiedImageUrl(room.image || '') || ROOM_IMAGE_PLACEHOLDER}
                    alt={room.name ?? 'Room image'}
                    width={300}
                    height={150}
                    className={styles.roomImage}
                    unoptimized
                  />
                  {!exits.isTerminal && exits.exits.length > 0 && (
                    <div className={styles.directionIndicators}>
                      {exits.exits.map(exit => (
                        <div 
                          key={exit.id} 
                          className={`${styles.directionIndicator} ${styles[`direction-${exit.direction.toLowerCase()}`]}`}
                          data-room-name={`${exit.direction}: ${exit.name}`}
                          title={`${exit.direction}: ${exit.name}`}
                          onMouseEnter={(e) => {
                            const tooltip = e.currentTarget.querySelector(`.${styles.directionIndicator}::after`);
                            if (tooltip) {
                              const rect = e.currentTarget.getBoundingClientRect();
                              const tooltipElement = tooltip as HTMLElement;
                              
                              // Position the tooltip opposite to the arrow direction
                              switch(exit.direction.toLowerCase()) {
                                case 'north':
                                  // Arrow points up, show tooltip below
                                  tooltipElement.style.left = `${rect.left + rect.width / 2}px`;
                                  tooltipElement.style.top = `${rect.bottom + 10}px`;
                                  tooltipElement.style.transform = 'translateX(-50%)';
                                  break;
                                case 'northeast':
                                  // Arrow points up-right, show tooltip down-left
                                  tooltipElement.style.left = `${rect.left - 10}px`;
                                  tooltipElement.style.top = `${rect.top + rect.height + 10}px`;
                                  tooltipElement.style.transform = 'translateX(-100%)';
                                  break;
                                case 'east':
                                  // Arrow points right, show tooltip to the left
                                  tooltipElement.style.left = `${rect.left - 10}px`;
                                  tooltipElement.style.top = `${rect.top + rect.height / 2}px`;
                                  tooltipElement.style.transform = 'translateX(-100%) translateY(-50%)';
                                  break;
                                case 'southeast':
                                  // Arrow points down-right, show tooltip up-left
                                  tooltipElement.style.left = `${rect.left - 10}px`;
                                  tooltipElement.style.top = `${rect.top - 10}px`;
                                  tooltipElement.style.transform = 'translateX(-100%) translateY(-100%)';
                                  break;
                                case 'south':
                                  // Arrow points down, show tooltip above
                                  tooltipElement.style.left = `${rect.left + rect.width / 2}px`;
                                  tooltipElement.style.top = `${rect.top - 10}px`;
                                  tooltipElement.style.transform = 'translateX(-50%) translateY(-100%)';
                                  break;
                                case 'southwest':
                                  // Arrow points down-left, show tooltip up-right
                                  tooltipElement.style.left = `${rect.right + 10}px`;
                                  tooltipElement.style.top = `${rect.top - 10}px`;
                                  tooltipElement.style.transform = 'translateY(-100%)';
                                  break;
                                case 'west':
                                  // Arrow points left, show tooltip to the right
                                  tooltipElement.style.left = `${rect.right + 10}px`;
                                  tooltipElement.style.top = `${rect.top + rect.height / 2}px`;
                                  tooltipElement.style.transform = 'translateY(-50%)';
                                  break;
                                case 'northwest':
                                  // Arrow points up-left, show tooltip down-right
                                  tooltipElement.style.left = `${rect.right + 10}px`;
                                  tooltipElement.style.top = `${rect.top + rect.height + 10}px`;
                                  break;
                              }
                              
                              // Show the tooltip
                              tooltipElement.style.visibility = 'visible';
                              tooltipElement.style.opacity = '1';
                            }
                          }}
                          onMouseLeave={(e) => {
                            const tooltip = e.currentTarget.querySelector(`.${styles.directionIndicator}::after`);
                            if (tooltip) {
                              const tooltipElement = tooltip as HTMLElement;
                              tooltipElement.style.visibility = 'hidden';
                              tooltipElement.style.opacity = '0';
                            }
                          }}
                        >
                          <span className={styles.directionArrow}>
                            {getDirectionArrow(exit.direction)}
                          </span>
                          <div className={styles.directionThumbnail}>
                            <Image
                              src={getProxiedImageUrl(exit.image) || ROOM_IMAGE_PLACEHOLDER}
                              alt={exit.name}
                              width={30}
                              height={30}
                              className={styles.roomThumbnail}
                              unoptimized
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                <div className={styles.playersContainer}>
                  {roomUsers.length > 0 ? (
                    <>
                      <div className={styles.playersLabel}>
                        Players: {roomUsers.length}
                      </div>
                      <div className={styles.playersList}>
                        {roomUsers.map(user => (
                          <div 
                            key={user.id} 
                            className={`${styles.playerBadge} ${user.status === 'killed' ? styles.killed : ''}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedUser(user);
                            }}
                            title={`ID: ${user.id}${user.username ? `\nUsername: ${user.username}` : ''}${user.displayName ? `\nDisplay Name: ${user.displayName}` : ''}${user.name ? `\nName: ${user.name}` : ''}`}
                          >
                            <span className={styles.playerName}>
                              <span className={styles.playerNameText}>
                                {user.name || user.displayName || user.username || user.id}
                              </span>
                              {user.status === 'killed' && ' 💀'}
                              {user.status === 'winner' && ' 🏆'}
                            </span>
                            <span className={styles.itemCount}>
                              ({user.inventory?.length || 0} 🎒)
                            </span>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className={styles.noPlayers}>No players in this room</div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
RoomGrid.displayName = "RoomGrid";

export default RoomGrid;