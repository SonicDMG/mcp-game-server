import { useEffect, useRef, useState } from 'react';
import styles from './RoomChat.module.css';

export function RoomChat({ roomId }: { roomId: string }) {
  const [messages, setMessages] = useState<{ userId: string; message: string; timestamp: number }[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const ws = new WebSocket(`wss://mcplayerone-do-backend.david-gilardi.workers.dev/room/${roomId}`);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        setMessages((prev) => [...prev, msg]);
      } catch {
        // Ignore malformed messages
      }
    };

    return () => ws.close();
  }, [roomId]);

  return (
    <div className={styles.roomChatContainer}>
      <h3 className={styles.roomChatHeader}>Room Chat</h3>
      <div className={styles.roomChatMessages}>
        {messages.map((m, i) => (
          <div key={i} className={styles.roomChatMessage}>
            <strong>{m.userId}:</strong> {m.message}
            <span className={styles.roomChatTimestamp}>
              {m.timestamp ? new Date(m.timestamp).toLocaleTimeString() : ''}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
} 