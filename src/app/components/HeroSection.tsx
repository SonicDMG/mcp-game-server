"use client";
import React, { useState, useMemo, useEffect } from "react";
import Image from 'next/image';
import Prism from 'prismjs';
import 'prismjs/themes/prism-tomorrow.css';
import 'prismjs/components/prism-json';
import 'prismjs/plugins/line-numbers/prism-line-numbers';
import 'prismjs/plugins/line-numbers/prism-line-numbers.css';

import styles from "./HeroSection.module.css";
import AudioInteraction from "./AudioInteraction";

type HeroSectionProps = object;

const HeroSection: React.FC<HeroSectionProps> = () => {
  const [showClaude, setShowClaude] = useState(false);
  const [showCursor, setShowCursor] = useState(false);
  const [showWarp, setShowWarp] = useState(false);
  const [copiedClaude, setCopiedClaude] = useState(false);
  const [copiedCursor, setCopiedCursor] = useState(false);
  const [copiedWarp, setCopiedWarp] = useState(false);
  useEffect(() => {
    // Highlight code blocks when modals open
    if (showClaude || showCursor) {
      Prism.highlightAll();
    }
  }, [showClaude, showCursor]);

  const getHost = () => (typeof window !== "undefined" ? window.location.origin : "");
  const { CLAUDE_CONFIG, CURSOR_CONFIG, SSE_URL } = useMemo(() => {
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
    return { CLAUDE_CONFIG, CURSOR_CONFIG, SSE_URL: sseUrl };
  }, []);

  return (
    <section className="landing-hero">
      <h1 className="landing-title">
        <span className="gradient-text">Create with AI - Play with MCP</span>
      </h1>
      <p className="landing-description">
        Build an interactive story using Langflow, then play it in real-time using MCP.
      </p>
      <div className="hero-logo-container">
        <Image 
          src="/images/logo.png" 
          alt="MCP Logo" 
          className="hero-logo" 
          width={0}
          height={0}
          sizes="100%"
          priority
        />
      </div>
      <div className={styles["how-to-play-container"]}>
        <a
          href="https://github.com/SonicDMG/mcp-game-server/blob/main/README.md#-getting-started"
          target="_blank"
          rel="noopener noreferrer"
          className={styles["how-to-play-button"]}
        >
          How to Play
        </a>
      </div>
      
      {/* Audio Interaction Component */}
      <div className={styles["audio-section"]}>
        <AudioInteraction storyId="demo" />
      </div>
      
      <div className="pixel-buttons">
        <button 
          className="pixel-button pixel-button-claude"
          onClick={() => setShowClaude(true)}
        >
          <span className="pixel-button-text">Claude</span>
          <span className="pixel-button-shine"></span>
        </button>
        <button 
          className="pixel-button pixel-button-cursor"
          onClick={() => setShowCursor(true)}
        >
          <span className="pixel-button-text">Cursor</span>
          <span className="pixel-button-shine"></span>
        </button>
        <button
          className="pixel-button pixel-button-warp"
          onClick={() => setShowWarp(true)}
        >
          <span className="pixel-button-text">Warp</span>
          <span className="pixel-button-shine"></span>
        </button>
      </div>

      {/* Claude Config Modal */}
      {showClaude && (
        <div className={styles["hero-modal-overlay"]} onClick={() => setShowClaude(false)}>
          <div className={styles["hero-modal"]} onClick={e => e.stopPropagation()}>
            <button aria-label="Close" onClick={() => setShowClaude(false)} className={styles["hero-modal-close"]}>✕</button>
            <h2 className={styles["hero-modal-title"]}>Claude MCP Config</h2>
            <pre className={`${styles["hero-modal-pre"]} line-numbers`}>
              <code className="language-json">
                {CLAUDE_CONFIG}
              </code>
            </pre>
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
            <pre className={`${styles["hero-modal-pre"]} line-numbers`}>
              <code className="language-json">
                {CURSOR_CONFIG}
              </code>
            </pre>
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
      {/* Warp SSE URL Modal */}
      {showWarp && (
        <div className={styles["hero-modal-overlay"]} onClick={() => setShowWarp(false)}>
          <div className={styles["hero-modal"]} onClick={e => e.stopPropagation()}>
            <button aria-label="Close" onClick={() => setShowWarp(false)} className={styles["hero-modal-close"]}>✕</button>
            <h2 className={styles["hero-modal-title"]}>Warp SSE URL</h2>
            <pre className={styles["hero-modal-pre"]} style={{ userSelect: 'all' }}>
              <code>{SSE_URL}</code>
            </pre>
            <div className={styles["warp-modal-note"]}>
              MCP support currently available in <a href="https://www.warp.dev/blog/warp-preview" target="_blank" rel="noopener noreferrer"><strong>WarpPreview</strong></a> only.
            </div>
            <button
              aria-label="Copy SSE URL"
              onClick={() => {
                navigator.clipboard.writeText(SSE_URL);
                setCopiedWarp(true);
                setTimeout(() => setCopiedWarp(false), 1000);
              }}
              className={styles["hero-modal-copy"]}
              title={copiedWarp ? 'Copied!' : 'Copy SSE URL'}
            >
              {copiedWarp ? 'Copied!' : 'Copy SSE URL'}
            </button>
          </div>
        </div>
      )}
    </section>
  );
};

export default HeroSection;
