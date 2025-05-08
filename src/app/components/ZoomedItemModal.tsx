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
  <div
    style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      background: 'rgba(0,0,0,0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    }}
    onClick={onClose}
  >
    <div
      style={{
        position: 'relative',
        maxWidth: '90vw',
        maxHeight: '90vh',
        background: '#23244a',
        borderRadius: 16,
        boxShadow: '0 8px 32px #000a',
        padding: 32,
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={e => e.stopPropagation()}
    >
      <Image
        src={getProxiedImageUrl(image)}
        alt={name}
        width={800}
        height={800}
        style={{
          maxWidth: '60vw',
          maxHeight: '80vh',
          objectFit: 'contain',
          borderRadius: 12,
          boxShadow: '0 8px 32px #000a',
          background: '#222',
          marginRight: 32,
          width: 800,
          height: 'auto',
        }}
      />
      <div style={{ flex: 1, color: '#fff', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{ color: '#a7a7ff', fontWeight: 700, fontSize: 22, marginBottom: 12 }}>{name}</div>
        <div style={{ fontSize: 16, marginBottom: 12 }}>{description}</div>
        {users && users.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 12, marginTop: 8 }}>
            {users.map(user => (
              <div key={user.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className={user.status === 'killed' ? styles.killedAvatarWrapper : undefined} style={{ display: 'inline-block' }}>
                  <Image
                    src={`https://api.dicebear.com/7.x/pixel-art/png?seed=${encodeURIComponent(user.id)}`}
                    alt={user.id}
                    width={32}
                    height={32}
                    style={{ borderRadius: 6, background: '#222', border: '2px solid #3b82f6' }}
                    unoptimized
                  />
                  {user.status === 'killed' && (
                    <span className={styles.killedSkullOverlay} style={{ fontSize: '3.5rem', color: '#ff0000' }} role="img" aria-label="eliminated">&times;</span>
                  )}
                </span>
                <span style={{ color: '#a7a7ff', fontSize: 16, textAlign: 'left', wordBreak: 'break-word' }} title={user.id}>
                  {user.id}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
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

export default ZoomedItemModal; 