// Utility functions for Durable Objects

export function validateMessage(msg: string): boolean {
  // Placeholder: Add real validation logic (length, content, etc.)
  return typeof msg === 'string' && msg.length > 0 && msg.length <= 500;
} 