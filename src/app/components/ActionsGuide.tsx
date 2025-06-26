import React, { useState } from 'react';
import styles from './ActionsGuide.module.css';

interface Action {
  name: string;
  command: string;
  description: string;
  examples?: string[];
  icon: string;
  category: 'exploration' | 'items' | 'social' | 'combat';
}

const ACTIONS: Action[] = [
  {
    name: 'Move',
    command: 'move',
    description: 'Navigate to a different room through available exits',
    examples: ['move to kitchen', 'move to north_room'],
    icon: '🚶',
    category: 'exploration'
  },
  {
    name: 'Look Around',
    command: 'look',
    description: 'Get detailed information about your current location, items, and exits',
    examples: ['look around', 'look'],
    icon: '👀',
    category: 'exploration'
  },
  {
    name: 'Take Item',
    command: 'take',
    description: 'Pick up an item from the current location and add it to your inventory',
    examples: ['take sword', 'take ancient_key'],
    icon: '🤏',
    category: 'items'
  },
  {
    name: 'Examine',
    command: 'examine',
    description: 'Get detailed information about a specific item or feature in the room',
    examples: ['examine painting', 'examine mysterious_box'],
    icon: '🔍',
    category: 'exploration'
  },
  {
    name: 'Solve Challenge',
    command: 'solve',
    description: 'Submit a solution to a puzzle, riddle, or challenge to earn artifacts',
    examples: ['solve riddle_1 "answer"', 'solve puzzle "solution"'],
    icon: '🧩',
    category: 'exploration'
  },
  {
    name: 'Send Message',
    command: 'message',
    description: 'Send a message to other players in the same room',
    examples: ['message "Hello everyone!"', 'message "Need help here"'],
    icon: '💬',
    category: 'social'
  },
  {
    name: 'Kill Player',
    command: 'kill',
    description: 'Attack another player in the same room (has random success/failure)',
    examples: ['kill player_name'],
    icon: '⚔️',
    category: 'combat'
  },
  {
    name: 'Loot Player',
    command: 'loot',
    description: 'Take items from a killed player in the same room',
    examples: ['loot dead_player item1 item2'],
    icon: '💰',
    category: 'combat'
  },
  {
    name: 'Help Player',
    command: 'help',
    description: 'Revive a killed player in the same room',
    examples: ['help dead_player'],
    icon: '🩹',
    category: 'social'
  }
];

const ACTION_CATEGORIES = {
  exploration: { label: 'Exploration', color: '#4CAF50' },
  items: { label: 'Items', color: '#FF9800' },
  social: { label: 'Social', color: '#2196F3' },
  combat: { label: 'Combat', color: '#F44336' }
};

export default function ActionsGuide() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const filteredActions = selectedCategory 
    ? ACTIONS.filter(action => action.category === selectedCategory)
    : ACTIONS;

  return (
    <div className={styles.actionsGuide}>
      <button 
        className={styles.toggleButton}
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
      >
        <span className={styles.toggleIcon}>
          {isExpanded ? '▼' : '▶'}
        </span>
        <span className={styles.toggleText}>
          Actions Guide
        </span>
        <span className={styles.actionCount}>
          ({ACTIONS.length} actions)
        </span>
      </button>

      {isExpanded && (
        <div className={styles.content}>
          <div className={styles.categoryFilter}>
            <button
              className={selectedCategory === null ? styles.categoryActive : styles.categoryButton}
              onClick={() => setSelectedCategory(null)}
            >
              All Actions
            </button>
            {Object.entries(ACTION_CATEGORIES).map(([key, category]) => (
              <button
                key={key}
                className={selectedCategory === key ? styles.categoryActive : styles.categoryButton}
                onClick={() => setSelectedCategory(key)}
                style={{ borderColor: category.color }}
              >
                {category.label}
              </button>
            ))}
          </div>

          <div className={styles.actionsList}>
            {filteredActions.map((action, index) => (
              <div key={index} className={styles.actionItem}>
                <div className={styles.actionHeader}>
                  <span className={styles.actionIcon} role="img" aria-label={action.name}>
                    {action.icon}
                  </span>
                  <span className={styles.actionName}>{action.name}</span>
                  <span 
                    className={styles.actionCategory}
                    style={{ backgroundColor: ACTION_CATEGORIES[action.category].color }}
                  >
                    {ACTION_CATEGORIES[action.category].label}
                  </span>
                </div>
                <p className={styles.actionDescription}>{action.description}</p>
                {action.examples && (
                  <div className={styles.actionExamples}>
                    <strong>Examples:</strong>
                    <ul>
                      {action.examples.map((example, idx) => (
                        <li key={idx}>
                          <code>{example}</code>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className={styles.helpNote}>
            <strong>💡 Pro Tip:</strong> Use specific item names and room IDs as shown in your current location description. 
            Actions like "move", "take", and "examine" work with the exact names displayed in the game.
          </div>
        </div>
      )}
    </div>
  );
} 