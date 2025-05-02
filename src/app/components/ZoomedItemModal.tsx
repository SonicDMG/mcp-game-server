import React from 'react';
import Image from 'next/image';
import { getProxiedImageUrl } from '../api/game/types';

interface ZoomedItemModalProps {
  image: string;
  name: string;
  description: string;
  onClose: () => void;
}

const ZoomedItemModal: React.FC<ZoomedItemModalProps> = ({ image, name, description, onClose }) => (
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
      style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh', background: '#23244a', borderRadius: 16, boxShadow: '0 8px 32px #000a', padding: 32 }}
      onClick={e => e.stopPropagation()}
    >
      <Image
        src={getProxiedImageUrl(image)}
        alt={name}
        width={320}
        height={320}
        style={{
          maxWidth: '60vw',
          maxHeight: '60vh',
          borderRadius: 12,
          objectFit: 'contain',
          boxShadow: '0 8px 32px #000a',
          background: '#222',
          marginBottom: 24,
        }}
      />
      <div style={{ color: '#a7a7ff', fontWeight: 700, fontSize: 22, marginBottom: 12, textAlign: 'center' }}>{name}</div>
      <div style={{ color: '#fff', fontSize: 16, marginBottom: 12, textAlign: 'center' }}>{description}</div>
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