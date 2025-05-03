import React from 'react';

const GITHUB_URL = "https://github.com/SonicDMG/mcp-game-server";
const README_URL = "https://github.com/SonicDMG/mcp-game-server#readme";

const AppFooter: React.FC = () => (
  <footer
    className="app-footer"
    style={{
      width: '100vw',
      padding: '20px 0 14px 0',
      textAlign: 'center',
      color: '#3b82f6',
      fontSize: '1.08rem',
      background: 'rgba(18, 22, 40, 0.98)',
      marginTop: 'auto',
      position: 'sticky',
      bottom: 0,
      zIndex: 30,
      borderTop: '1.5px solid #232428',
      minHeight: 56,
      boxShadow: '0 -2px 16px #000a',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}
  >
    <div style={{ display: 'flex', gap: 24, alignItems: 'center', justifyContent: 'center', width: '100%' }}>
      <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" style={{ color: '#a7a7ff', fontSize: '1rem', textDecoration: 'none', opacity: 0.85, fontWeight: 500 }}>GitHub</a>
      <a href={README_URL} target="_blank" rel="noopener noreferrer" style={{ color: '#a7a7ff', fontSize: '1rem', textDecoration: 'none', opacity: 0.85, fontWeight: 500 }}>Learn how this app was built</a>
    </div>
  </footer>
);

export default AppFooter; 