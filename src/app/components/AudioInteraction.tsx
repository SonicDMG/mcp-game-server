import React, { useCallback } from 'react';
import { useConversation } from '@elevenlabs/react';
import styles from './AudioInteraction.module.css';

interface AudioInteractionProps {
  storyId: string;
  className?: string;
}

export default function AudioInteraction({ storyId, className }: AudioInteractionProps) {
  const conversation = useConversation({
    onConnect: () => console.log('Connected to ElevenLabs agent'),
    onDisconnect: () => console.log('Disconnected from ElevenLabs agent'),
    onMessage: (message) => console.log('Message from agent:', message),
    onError: (error) => console.error('ElevenLabs conversation error:', error),
  });

  const getSignedUrl = async (): Promise<string> => {
    const response = await fetch("/api/elevenlabs/signed-url");
    if (!response.ok) {
      throw new Error(`Failed to get signed url: ${response.statusText}`);
    }
    const { signedUrl } = await response.json();
    return signedUrl;
  };

  const startConversation = useCallback(async () => {
    try {
      console.log('Requesting microphone permission...');
      await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('Microphone permission granted');

      console.log('Getting signed URL for private agent...');
      const signedUrl = await getSignedUrl();
      console.log('Signed URL obtained successfully');

      console.log('Starting ElevenLabs session...');
      await conversation.startSession({
        signedUrl,
      });

      console.log(`Started audio conversation for story: ${storyId}`);
    } catch (error) {
      console.error('Failed to start conversation:', error);
    }
  }, [conversation, storyId]);

  const stopConversation = useCallback(async () => {
    try {
      await conversation.endSession();
      console.log(`Stopped audio conversation for story: ${storyId}`);
    } catch (error) {
      console.error('Failed to stop conversation:', error);
    }
  }, [conversation, storyId]);

  const isConnected = conversation.status === 'connected';
  const isConnecting = conversation.status === 'connecting';
  const isSpeaking = conversation.isSpeaking;

  // Determine status text and color
  const getStatus = () => {
    if (isConnecting) return { text: 'Connecting...', color: 'connecting' };
    if (isConnected && isSpeaking) return { text: 'Speaking', color: 'speaking' };
    if (isConnected && !isSpeaking) return { text: 'Listening', color: 'listening' };
    return { text: 'Ready', color: 'ready' };
  };

  const status = getStatus();

  return (
    <div className={`${styles.audioContainer} ${className || ''}`}>
      <div className={styles.audioMain}>
        {/* Dynamic Visual Widget */}
        <div className={styles.visualWidget}>
          <div 
            className={`${styles.avatarOrb} ${isConnecting ? styles.connecting : ''} ${isConnected ? styles.connected : ''} ${isSpeaking ? styles.speaking : ''}`}
            onClick={isConnected ? stopConversation : startConversation}
            title={isConnecting ? "Connecting..." : isConnected ? "Click to end conversation" : "Click to start conversation"}
          >
            <div className={styles.orbCore}></div>
            <div className={styles.orbRing}></div>
            {isSpeaking && (
              <div className={styles.waveform}>
                <div className={styles.waveBar}></div>
                <div className={styles.waveBar}></div>
                <div className={styles.waveBar}></div>
                <div className={styles.waveBar}></div>
                <div className={styles.waveBar}></div>
              </div>
            )}
          </div>
        </div>
        
        {/* Content Area */}
        <div className={styles.audioContent}>
          <div className={styles.audioHeader}>
            <div className={`${styles.statusBadge} ${styles[status.color]}`}>
              <div className={styles.statusDot}></div>
              <span className={styles.statusText}>{status.text}</span>
            </div>
          </div>
          
          <div className={styles.audioAction}>
            <button
              className={`${styles.actionButton} ${isConnected ? styles.active : ''}`}
              onClick={isConnected ? stopConversation : startConversation}
              disabled={isConnecting}
            >
              {isConnecting ? 'Connecting...' : isConnected ? 'End Conversation' : 'Start Conversation'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 