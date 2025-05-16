'use client';
import React from 'react';

import styles from './AppHeader.module.css';


interface Breadcrumb {
  label: string;
  href?: string;
}

interface AppHeaderProps {
  breadcrumbs: Breadcrumb[];
}





const AppHeader: React.FC<AppHeaderProps> = ({ breadcrumbs }) => {
  return (
    <header className={styles.headerContainer}>

      <div className={styles.breadcrumbsRow}>
        <div className={styles.headerLeft}>
          <a href="https://langflow.org/" target="_blank" rel="noopener noreferrer" className="footer-link">powered by <b>Langflow</b></a>
        </div>
        <div className={styles.headerRight}>
          {breadcrumbs.map((crumb, idx) => (
            <span key={crumb.label + idx}>
              {crumb.href ? <a href={crumb.href} className="breadcrumb-link">{crumb.label}</a> : <span style={{ color: '#a78bfa' }}>{crumb.label}</span>}
              {idx < breadcrumbs.length - 1 && <span style={{ margin: '0 6px' }}>/</span>}
            </span>
          ))}
        </div>
      </div>
    </header>
  );
}

export default AppHeader;