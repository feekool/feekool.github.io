// API Error Handler
// Handles GitHub API errors including rate limits

import { safeLogError } from './utils';

// Store rate limit callback globally
let showRateLimitModalCallback: (() => void) | null = null;

export function setRateLimitModalCallback(callback: () => void) {
  showRateLimitModalCallback = callback;
}

export function handleApiError(error: any, operation: string): never {
  // Check for rate limit errors
  if (isRateLimitError(error)) {
    safeLogError(`${operation} failed due to rate limit:`, error);
    if (showRateLimitModalCallback) {
      showRateLimitModalCallback();
    }
    throw error;
  }

  // Handle other API errors
  safeLogError(`${operation} failed:`, error);
  throw error;
}

function isRateLimitError(error: any): boolean {
  if (!error || !error.message) return false;

  const message = error.message.toLowerCase();

  // Check for common rate limit error patterns
  const rateLimitPatterns = [
    'rate limit',
    'api rate limit',
    'too many requests',
    'secondary rate limit',
    'exceeded',
    'limit exceeded'
  ];

  return (
    error.status === 429 ||
    rateLimitPatterns.some(pattern => message.includes(pattern))
  );
}

// Export for use in components
export { useRateLimit } from './rateLimit';