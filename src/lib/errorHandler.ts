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

  process.on('unhandledRejection', (reason, _promise) => {
    // Check if this is a ResponseAborted error (normal client disconnection)
    if (reason && typeof reason === 'object') {
      // Check multiple possible ways the error name might be stored
      const hasNameProperty = 'name' in reason;
      const errorName = hasNameProperty ? (reason as { name: string }).name : undefined;
      const constructorName = reason.constructor && reason.constructor.name;
      const stringIncludes = reason.toString().includes('ResponseAborted');
      
      if (errorName === 'ResponseAborted' || constructorName === 'ResponseAborted' || stringIncludes) {
        // This is normal - client disconnected (closed browser, navigated away, etc.)
        // No logging needed as this is expected behavior
        return;
      }
    }

    // Log other unhandled rejections
    logger.error('unhandledRejection:', reason);
  });

  handlerRegistered = true;
} 