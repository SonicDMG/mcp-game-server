"use client";
import React, { useState, useMemo } from "react";

import styles from "./HeroSection.module.css";
import headerStyles from "./AppHeader.module.css";

type HeroSectionProps = object;

const HeroSection: React.FC<HeroSectionProps> = () => {
  const [showClaude, setShowClaude] = useState(false);
  const [showCursor, setShowCursor] = useState(false);
  const [copiedClaude, setCopiedClaude] = useState(false);
  const [copiedCursor, setCopiedCursor] = useState(false);

  const getHost = () => (typeof window !== "undefined" ? window.location.origin : "");
  const { CLAUDE_CONFIG, CURSOR_CONFIG } = useMemo(() => {
    const host = getHost();
    const sseUrl = `${host}/api/v1/mcp/sse`;
    const openapiUrl = `${host}/api/v1/mcp/openapi`;
    const CLAUDE_CONFIG = `{
  \"mcpServers\": {
    \"MCPlayerOne\": {
      \"command\": \"uvx\",
      \"args\": [\"mcp-proxy\", \"${sseUrl}\"]
    }
  }
}`;
    const CURSOR_CONFIG = `{
  \"MCPlayerOne\": {
    \"transportType\": \"sse\",
    \"url\": \"${sseUrl}\",
    \"openapi\": \"${openapiUrl}\"
  }
}`;
    return { CLAUDE_CONFIG, CURSOR_CONFIG };
  }, []);

  return (
    <section className="landing-hero">
      <h1 className="landing-title">
        <span className="gradient-text">MCP</span> Game Server
      </h1>
      <p className="landing-subtitle">
        Jump into a world of interactive stories, mysteries, and challenges.<br />
        Play, compete, and become a legend!
      </p>
      <div className="hero-logo-container">
        <img 
          src="/images/logo.png" 
          alt="MCP Logo" 
          className="hero-logo" 
          width={400} 
          height={400}
        />
      </div>
      <div className="hero-buttons">
        <button 
          className={`${headerStyles.headerButton} ${headerStyles.claudeButton} hero-button`}
          onClick={() => setShowClaude(true)}
        >
          Claude
        </button>
        <button 
          className={`${headerStyles.headerButton} ${headerStyles.cursorButton} hero-button`}
          onClick={() => setShowCursor(true)}
        >
          Cursor
        </button>
      </div>

      {/* Claude Config Modal */}
      {showClaude && (
        <div className={styles["hero-modal-overlay"]} onClick={() => setShowClaude(false)}>
          <div className={styles["hero-modal"]} onClick={e => e.stopPropagation()}>
            <button aria-label="Close" onClick={() => setShowClaude(false)} className={styles["hero-modal-close"]}>✕</button>
            <h2 className={styles["hero-modal-title"]}>Claude MCP Config</h2>
            <pre className={styles["hero-modal-pre"]}>{CLAUDE_CONFIG}</pre>
            <button
              aria-label="Copy config"
              onClick={() => {
                navigator.clipboard.writeText(CLAUDE_CONFIG);
                setCopiedClaude(true);
                setTimeout(() => setCopiedClaude(false), 1000);
              }}
              className={styles["hero-modal-copy"]}
              title={copiedClaude ? 'Copied!' : 'Copy config'}
            >
              {copiedClaude ? 'Copied!' : 'Copy config'}
            </button>
          </div>
        </div>
      )}
      {/* Cursor Config Modal */}
      {showCursor && (
        <div className={styles["hero-modal-overlay"]} onClick={() => setShowCursor(false)}>
          <div className={styles["hero-modal"]} onClick={e => e.stopPropagation()}>
            <button aria-label="Close" onClick={() => setShowCursor(false)} className={styles["hero-modal-close"]}>✕</button>
            <h2 className={styles["hero-modal-title"]}>Cursor MCP Config</h2>
            <pre className={styles["hero-modal-pre"]}>{CURSOR_CONFIG}</pre>
            <button
              aria-label="Copy config"
              onClick={() => {
                navigator.clipboard.writeText(CURSOR_CONFIG);
                setCopiedCursor(true);
                setTimeout(() => setCopiedCursor(false), 1000);
              }}
              className={styles["hero-modal-copy"]}
              title={copiedCursor ? 'Copied!' : 'Copy config'}
            >
              {copiedCursor ? 'Copied!' : 'Copy config'}
            </button>
          </div>
        </div>
      )}
    </section>
  );
};

export default HeroSection;
