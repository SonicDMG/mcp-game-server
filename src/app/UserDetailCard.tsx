import React from 'react';
import Image from 'next/image';
import { getProxiedImageUrl, GameItem } from './api/game/types';
import styles from './components/WinnerBanner.module.css';
import userCardStyles from './components/UserDetailCard.module.css';

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
      className={userCardStyles.overlay}
      onClick={handleBackgroundClick}
    >
      <div
        className={userCardStyles.card}
      >
        <div className={userCardStyles.header}>
          <div className={user.status === 'killed' ? styles.killedAvatarWrapper : undefined}>
            <Image
              src={getProxiedImageUrl(avatarUrl(user.id))}
              alt={`${user.id}'s avatar`}
              width={80}
              height={80}
              className={userCardStyles.avatar}
            />
            {user.status === 'killed' && (
              <span className={styles.killedSkullOverlay} style={{ fontSize: '5rem' }} role="img" aria-label="eliminated">&times;</span>
            )}
          </div>
          <div className={userCardStyles.userInfo}>
            <h2 className={userCardStyles.userId} title={user.id}>
              {user.id}
            </h2>
            {user.status === 'killed' && (
              <div className={userCardStyles.dead}>DEAD</div>
            )}
            <div className={userCardStyles.room}>
              Current Room: {user.room}
            </div>
          </div>
          <button
            onClick={onClose}
            className={userCardStyles.closeBtn}
          >
            ×
          </button>
        </div>

        <div className={userCardStyles.inventorySection}>
          <h3 className={userCardStyles.inventoryTitle}>Inventory</h3>
          <div className={userCardStyles.inventoryGrid}>
            {user.inventory.length === 0 ? (
              <div className={userCardStyles.emptyInventory}>No artifacts collected yet</div>
            ) : (
              user.inventory.map((itemId, idx) => {
                const itemObj = items.find(i => i.id === itemId);
                const isRequired = story.requiredArtifacts?.includes(itemId);
                return (
                  <div
                    key={itemId + '-' + idx}
                    className={isRequired ? `${userCardStyles.inventoryItem} ${userCardStyles.inventoryItemRequired}` : userCardStyles.inventoryItem}
                    onClick={() => setZoomedItem && itemObj && setZoomedItem({
                      image: itemObj.image || '/images/item-placeholder.png',
                      name: itemObj.name || itemId,
                      description: itemObj.description || ''
                    })}
                  >
                    <Image
                      src={getProxiedImageUrl(itemObj?.image || '/images/item-placeholder.png')}
                      alt={itemObj?.name || itemId}
                      width={48}
                      height={48}
                      className={isRequired ? `${userCardStyles.itemImage} ${userCardStyles.itemImageRequired}` : userCardStyles.itemImage}
                      title={itemObj?.name || itemId}
                      unoptimized
                    />
                    <span
                      className={userCardStyles.itemName}
                      title={itemObj?.name || itemId}
                    >
                      {itemObj?.name || itemId}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className={userCardStyles.progressSection}>
          <h3 className={userCardStyles.progressTitle}>Required Artifact Progress</h3>
          <div className={userCardStyles.progressBarContainer}>
            <div className={userCardStyles.progressBarBg}>
              <div
                className={userCardStyles.progressBar}
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            <div className={userCardStyles.progressText}>
              {requiredCollected.length}/{totalRequired}
            </div>
          </div>
        </div>

        {user.reachedGoal && (
          <div className={userCardStyles.goal}>
            🏆 Reached the Goal!
          </div>
        )}
      </div>
    </div>
  );
} 