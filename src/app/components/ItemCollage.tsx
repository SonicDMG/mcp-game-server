import React from 'react';
import Image from 'next/image';
import { getProxiedImageUrl } from '../api/game/types';

interface Item {
  id: string;
  name: string;
  description: string;
  image?: string;
}

interface ItemCollageProps {
  items: Item[];
  collectedItemIds: Set<string>;
  requiredArtifacts?: string[];
  setZoomedItem: (item: { image: string; name: string; description: string }) => void;
}

const ItemCollage: React.FC<ItemCollageProps> = ({ items, collectedItemIds, requiredArtifacts = [], setZoomedItem }) => (
  <div style={{
    background: '#181c2a',
    borderRadius: 12,
    padding: 12,
    boxShadow: '0 2px 12px #0006',
    minWidth: 240,
    maxWidth: 320,
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 8,
    justifyItems: 'center',
    height: '100%',
    flex: 1,
  }}>
    {items.map((item, idx) => {
      const normalizedId = String(item.id).trim().toLowerCase();
      const normalizedRequired = requiredArtifacts.map(id => String(id).trim().toLowerCase());
      const isRequired = normalizedRequired.includes(normalizedId);
      const isCollected = collectedItemIds.has(item.id);
      let border, boxShadow, opacity;
      if (isRequired) {
        border = '2px solid #ffd700';
        boxShadow = isCollected ? '0 0 8px 2px #ffd700cc' : '0 0 4px 1px #ffd70099';
        opacity = isCollected ? 1 : 0.7;
      } else if (isCollected) {
        border = '2px solid #3b82f6';
        boxShadow = '0 0 8px 2px #3b82f6cc';
        opacity = 1;
      } else {
        border = '2px solid #333';
        boxShadow = '0 1px 4px #000a';
        opacity = 0.5;
      }
      return (
        <div key={item.id + '-' + idx} style={{ position: 'relative', textAlign: 'center', cursor: 'pointer' }} title={item.name + ': ' + item.description}>
          <Image
            src={getProxiedImageUrl(item.image || '/images/item-placeholder.png')}
            alt={item.name}
            width={40}
            height={40}
            style={{
              borderRadius: 6,
              boxShadow,
              opacity,
              border,
              background: '#222',
              marginBottom: 2,
              width: 40,
              height: 'auto',
              transition: 'box-shadow 0.2s, border 0.2s',
            }}
            onClick={() => setZoomedItem({ image: item.image || '/images/item-placeholder.png', name: item.name, description: item.description })}
          />
          {isCollected && (
            <span style={{
              position: 'absolute',
              top: 0,
              right: 0,
              background: isRequired ? '#ffd700' : '#3b82f6',
              color: '#fff',
              borderRadius: '50%',
              width: 18,
              height: 18,
              fontSize: 14,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid #181c2a',
              boxShadow: '0 1px 4px #000a',
            }}>✔</span>
          )}
          <div style={{ fontSize: 11, color: '#a7a7ff', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 50 }}>{item.name}</div>
        </div>
      );
    })}
  </div>
);

export default ItemCollage; 