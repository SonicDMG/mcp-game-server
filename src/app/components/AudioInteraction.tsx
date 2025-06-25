import React, { useCallback, useState } from 'react';
import { useConversation } from '@elevenlabs/react';
import styles from './AudioInteraction.module.css';

interface AudioInteractionProps {
  storyId: string;
  className?: string;
}

export default function AudioInteraction({ storyId, className }: AudioInteractionProps) {
  const [isMuted, setIsMuted] = useState(false);
  
  const conversation = useConversation({
    micMuted: isMuted,
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
      setIsMuted(false);
    } catch (error) {
      console.error('Failed to stop conversation:', error);
    }
  }, [conversation, storyId]);

  const toggleMute = useCallback(() => {
    const newMutedState = !isMuted;
    setIsMuted(newMutedState);
    console.log(`Microphone ${newMutedState ? 'muted' : 'unmuted'}`);
  }, [isMuted]);

  const isConnected = conversation.status === 'connected';
  const isConnecting = conversation.status === 'connecting';
  const isSpeaking = conversation.isSpeaking;

  // Determine status text and color
  const getStatus = () => {
    if (isMuted) return { text: 'Muted', color: 'muted' };
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
            className={`${styles.avatarOrb} ${isConnecting ? styles.connecting : ''} ${isConnected ? styles.connected : ''} ${isSpeaking ? styles.speaking : ''} ${isMuted ? styles.muted : ''}`}
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
            
            {/* Mute Button */}
            {isConnected && (
              <div className={styles.controlButtons}>
                <button
                  className={`${styles.controlButton} ${isMuted ? styles.muted : ''}`}
                  onClick={toggleMute}
                  title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
                  disabled={isConnecting}
                >
                  {isMuted ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2c1.1 0 2 .9 2 2v6c0 1.1-.9 2-2 2s-2-.9-2-2V4c0-1.1.9-2 2-2zm5.3 4.7c-.8 0-1.3.9-1.3 1.3 0 2.1-1.7 3.8-3.8 3.8s-3.8-1.7-3.8-3.8c0-.4-.5-1.3-1.3-1.3s-1.3.9-1.3 1.3c0 3.7 2.8 6.9 6.3 7.3V17c0 .6.4 1 1 1s1-.4 1-1v-1.7c3.5-.4 6.3-3.6 6.3-7.3 0-.4-.5-1.3-1.3-1.3z"/>
                    </svg>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 