import { setupGlobalErrorHandler } from './src/lib/errorHandler';

export function register() {
  // Set up global error handling for unhandled promise rejections
  setupGlobalErrorHandler();
} 