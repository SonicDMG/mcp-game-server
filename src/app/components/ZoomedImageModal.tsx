import React from 'react';
import Image from 'next/image';
import { getProxiedImageUrl } from '../api/game/types';

interface ZoomedImageModalProps {
  image: string;
  onClose: () => void;
}

const ZoomedImageModal: React.FC<ZoomedImageModalProps> = ({ image, onClose }) => (
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
      style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }}
      onClick={e => e.stopPropagation()}
    >
      <Image
        src={getProxiedImageUrl(image)}
        alt="Zoomed Room"
        width={600}
        height={400}
        style={{
          maxWidth: '90vw',
          maxHeight: '80vh',
          borderRadius: 12,
          objectFit: 'contain',
          boxShadow: '0 8px 32px #000a',
          background: '#222',
        }}
      />
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

export default ZoomedImageModal; 