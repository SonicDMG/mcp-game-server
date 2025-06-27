/**
 * Global error handler for unhandled promise rejections
 * Handles ResponseAborted errors gracefully (client disconnections)
 */

import logger from './logger';

let handlerRegistered = false;

export function setupGlobalErrorHandler() {
  // Only register the handler once to avoid conflicts
  if (handlerRegistered || typeof process === 'undefined' || !process.on) {
    return;
  }

  process.on('unhandledRejection', (reason, promise) => {
    // Check if this is a ResponseAborted error (normal client disconnection)
    if (reason && typeof reason === 'object' && reason.constructor && reason.constructor.name === 'ResponseAborted') {
      // This is normal - client disconnected (closed browser, navigated away, etc.)
      // No logging needed as this is expected behavior
      return;
    }

    // Log other unhandled rejections
    logger.error('[Global] Unhandled Promise Rejection:', reason);
    logger.error('[Global] Promise:', promise);
  });

  handlerRegistered = true;
} 