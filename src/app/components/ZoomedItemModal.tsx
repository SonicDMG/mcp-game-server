import React from 'react';
import Image from 'next/image';
import { getProxiedImageUrl } from '../../lib/utils';
import styles from './WinnerBanner.module.css';

interface ZoomedItemModalProps {
  image: string;
  name: string;
  description: string;
  onClose: () => void;
  users?: { id: string; status?: 'playing' | 'winner' | 'killed' }[];
}

const ZoomedItemModal: React.FC<ZoomedItemModalProps> = ({ image, name, description, onClose, users }) => (
  <div className={styles.modalOverlay} onClick={onClose}>
    <div className={styles.modalContainer} onClick={e => e.stopPropagation()}>
      <Image
        src={getProxiedImageUrl(image)}
        alt={name}
        width={800}
        height={800}
        className={styles.modalImage}
      />
      <div className={styles.modalContent}>
        <div className={styles.modalTitle}>{name}</div>
        <div className={styles.modalDescription}>{description}</div>
        {users && users.length > 0 && (
          <div className={styles.modalUsersList}>
            {users.map(user => (
              <div key={user.id} className={styles.modalUserItem}>
                <span className={user.status === 'killed' ? styles.killedAvatarWrapper : undefined} style={{ display: 'inline-block' }}>
                  <Image
                    src={`https://api.dicebear.com/7.x/pixel-art/png?seed=${encodeURIComponent(user.id)}`}
                    alt={user.id}
                    width={32}
                    height={32}
                    className={styles.modalUserAvatar}
                    unoptimized
                  />
                  {user.status === 'killed' && (
                    <span className={styles.killedSkullOverlay} style={{ fontSize: '3.5rem', color: '#ff0000' }} role="img" aria-label="eliminated">&times;</span>
                  )}
                </span>
                <span className={styles.modalUserName} title={user.id}>
                  {user.id}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
      <button onClick={onClose} className={styles.modalCloseButton}>
        ✕
      </button>
    </div>
  </div>
);

export default ZoomedItemModal; 