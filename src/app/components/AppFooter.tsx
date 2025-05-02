import React from 'react';

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
      justifyContent: 'flex-end',
    }}
  >
    <a
      href="https://langflow.org/"
      target="_blank"
      rel="noopener noreferrer"
      style={{
        position: 'absolute',
        right: 24,
        bottom: 10,
        color: '#a78bfa',
        fontSize: '1rem',
        textDecoration: 'none',
        opacity: 0.85,
        fontWeight: 500,
      }}
    >
      Powered by Langflow
    </a>
  </footer>
);

export default AppFooter; 