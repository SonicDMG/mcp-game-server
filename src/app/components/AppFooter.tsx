import React from 'react';
import styles from './AppFooter.module.css';

const GITHUB_URL = "https://github.com/SonicDMG/mcp-game-server";
const README_URL = "https://github.com/SonicDMG/mcp-game-server#readme";

const AppFooter: React.FC = () => (
  <footer className={styles.footer}>
    <div className={styles.footerLinks}>
      <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className={styles.footerLink}>GitHub</a>
      <a href={README_URL} target="_blank" rel="noopener noreferrer" className={styles.footerLink}>Learn how this app was built</a>
    </div>
  </footer>
);

export default AppFooter; 