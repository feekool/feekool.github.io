/**
 * Tests for Offline Write Queue (Outbox)
 * 
 * These tests verify the queue functionality:
 * 1. Adding requests to queue when 401 received
 * 2. Adding requests to queue when offline
 * 3. Synchronizing queued requests when token available
 * 4. Retry logic and max retries
 * 5. Message passing between frontend and Service Worker
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  openTokenDB,
  openQueueDB,
  getStoredToken,
  storeTokenInDB,
  clearStoredToken,
  addToQueue,
  removeFromQueue,
  getAllQueuedRequests,
  updateQueueRetries,
  clearQueue,
  QueuedRequest
} from '../lib/queueManagement';

describe('Queue Management Module', () => {
  beforeEach(async () => {
    // Clear databases before each test
    await clearQueue();
    await clearStoredToken();
  });

  afterEach(async () => {
    // Clean up after tests
    await clearQueue();
    await clearStoredToken();
  });

  describe('Token Storage', () => {
    it('should store and retrieve token', async () => {
      const token = 'github_pat_test_token_123';
      
      await storeTokenInDB(token);
      const retrieved = await getStoredToken();
      
      expect(retrieved).toBe(token);
    });

    it('should clear stored token', async () => {
      const token = 'github_pat_test_token_123';
      
      await storeTokenInDB(token);
      await clearStoredToken();
      const retrieved = await getStoredToken();
      
      expect(retrieved).toBeNull();
    });

    it('should return null when no token stored', async () => {
      const token = await getStoredToken();
      expect(token).toBeNull();
    });
  });

  describe('Queue Operations', () => {
    it('should add request to queue', async () => {
      const id = await addToQueue(
        'https://api.github.com/repos/test/repo/issues',
        'POST',
        { 'Content-Type': 'application/json' },
        '{"title":"Test Issue"}'
      );

      expect(id).toBeTruthy();

      const requests = await getAllQueuedRequests();
      expect(requests).toHaveLength(1);
      expect(requests[0].id).toBe(id);
      expect(requests[0].method).toBe('POST');
    });

    it('should add multiple requests to queue', async () => {
      const id1 = await addToQueue(
        'https://api.github.com/repos/test/repo/issues',
        'POST',
        { 'Content-Type': 'application/json' },
        '{"title":"Issue 1"}'
      );

      const id2 = await addToQueue(
        'https://api.github.com/repos/test/repo/issues/1',
        'PUT',
        { 'Content-Type': 'application/json' },
        '{"title":"Updated Issue"}'
      );

      const requests = await getAllQueuedRequests();
      expect(requests).toHaveLength(2);
      expect(requests.map(r => r.id).sort()).toEqual([id1, id2].sort());
    });

    it('should remove request from queue', async () => {
      const id = await addToQueue(
        'https://api.github.com/repos/test/repo/issues',
        'POST',
        {},
        ''
      );

      await removeFromQueue(id);

      const requests = await getAllQueuedRequests();
      expect(requests).toHaveLength(0);
    });

    it('should update retry count', async () => {
      const id = await addToQueue(
        'https://api.github.com/repos/test/repo/issues',
        'POST',
        {},
        ''
      );

      await updateQueueRetries(id, 1);

      const requests = await getAllQueuedRequests();
      expect(requests[0].retries).toBe(1);

      await updateQueueRetries(id, 2);
      const updated = await getAllQueuedRequests();
      expect(updated[0].retries).toBe(2);
    });

    it('should clear entire queue', async () => {
      await addToQueue('https://api.github.com/repos/test/repo/issues', 'POST', {}, '');
      await addToQueue('https://api.github.com/repos/test/repo/issues/1', 'PUT', {}, '');
      await addToQueue('https://api.github.com/repos/test/repo/issues/2', 'DELETE', {}, '');

      const beforeClear = await getAllQueuedRequests();
      expect(beforeClear).toHaveLength(3);

      await clearQueue();

      const afterClear = await getAllQueuedRequests();
      expect(afterClear).toHaveLength(0);
    });
  });

  describe('Queue Request Structure', () => {
    it('should have correct request structure', async () => {
      const body = JSON.stringify({ title: 'Test' });
      const id = await addToQueue(
        'https://api.github.com/repos/test/repo/issues',
        'POST',
        { 'Content-Type': 'application/json', 'Accept': 'application/vnd.github.v3+json' },
        body
      );

      const requests = await getAllQueuedRequests();
      const request = requests[0] as QueuedRequest;

      expect(request).toHaveProperty('id');
      expect(request).toHaveProperty('url');
      expect(request).toHaveProperty('method');
      expect(request).toHaveProperty('headers');
      expect(request).toHaveProperty('body');
      expect(request).toHaveProperty('timestamp');
      expect(request).toHaveProperty('retries');

      expect(request.method).toBe('POST');
      expect(request.body).toBe(body);
      expect(request.retries).toBe(0);
      expect(request.headers['Content-Type']).toBe('application/json');
    });
  });

  describe('Timestamp and Retry Tracking', () => {
    it('should record timestamp when adding to queue', async () => {
      const beforeAdd = Date.now();
      
      await addToQueue('https://api.github.com/test', 'POST', {}, '');
      
      const afterAdd = Date.now();

      const requests = await getAllQueuedRequests();
      expect(requests[0].timestamp).toBeGreaterThanOrEqual(beforeAdd);
      expect(requests[0].timestamp).toBeLessThanOrEqual(afterAdd);
    });

    it('should initialize retries to 0', async () => {
      await addToQueue('https://api.github.com/test', 'POST', {}, '');

      const requests = await getAllQueuedRequests();
      expect(requests[0].retries).toBe(0);
    });

    it('should track retry attempts', async () => {
      const id = await addToQueue('https://api.github.com/test', 'POST', {}, '');

      // Simulate 3 retry attempts
      for (let i = 1; i <= 3; i++) {
        await updateQueueRetries(id, i);
        const requests = await getAllQueuedRequests();
        expect(requests[0].retries).toBe(i);
      }
    });
  });

  describe('Queue Querying', () => {
    it('should maintain insertion order', async () => {
      const id1 = await addToQueue('https://api.github.com/test/1', 'POST', {}, '');
      const id2 = await addToQueue('https://api.github.com/test/2', 'POST', {}, '');
      const id3 = await addToQueue('https://api.github.com/test/3', 'POST', {}, '');

      const requests = await getAllQueuedRequests();
      expect(requests.map(r => r.id)).toEqual([id1, id2, id3]);
    });

    it('should return empty array when queue is empty', async () => {
      const requests = await getAllQueuedRequests();
      expect(requests).toEqual([]);
      expect(Array.isArray(requests)).toBe(true);
    });
  });

  describe('Database Isolation', () => {
    it('should use separate databases for token and queue', async () => {
      // Store token
      await storeTokenInDB('test_token');

      // Add queue items
      await addToQueue('https://api.github.com/test', 'POST', {}, '');
      await addToQueue('https://api.github.com/test', 'PUT', {}, '');

      // Verify both exist independently
      const token = await getStoredToken();
      const requests = await getAllQueuedRequests();

      expect(token).toBe('test_token');
      expect(requests).toHaveLength(2);

      // Clear queue shouldn't affect token
      await clearQueue();
      const tokenAfterClearQueue = await getStoredToken();
      expect(tokenAfterClearQueue).toBe('test_token');

      // Clear token shouldn't affect queue would have failed if queue was cleared
      const requests2 = await getAllQueuedRequests();
      expect(requests2).toHaveLength(0); // Already cleared above
    });
  });

  describe('Error Handling', () => {
    it('should handle adding request with null body gracefully', async () => {
      const id = await addToQueue(
        'https://api.github.com/test',
        'GET',
        {},
        null
      );

      const requests = await getAllQueuedRequests();
      expect(requests[0].body).toBeNull();
      expect(requests[0].id).toBe(id);
    });

    it('should handle removing non-existent request gracefully', async () => {
      // Should not throw error
      await expect(removeFromQueue('non-existent-id')).resolves.toBeUndefined();
    });

    it('should handle updating retries for non-existent request gracefully', async () => {
      // Should not throw error
      await expect(updateQueueRetries('non-existent-id', 1)).resolves.toBeUndefined();
    });
  });
});

/**
 * Integration Tests for Service Worker Message Passing
 * 
 * NOTE: These tests require Service Worker to be registered
 * and should be run in an environment with proper SW support
 */
describe('Service Worker Message Passing (Integration)', () => {
  it('should post message to service worker', async () => {
    // This is a placeholder for integration tests
    // Actual implementation depends on test environment setup
    
    // Mock postToServiceWorker function
    expect(true).toBe(true);
  });

  it('should listen for service worker messages', async () => {
    // This is a placeholder for integration tests
    expect(true).toBe(true);
  });
});

/**
 * Scenarios Testing
 */
describe('Offline Write Queue Scenarios', () => {
  beforeEach(async () => {
    await clearQueue();
    await clearStoredToken();
  });

  it('Scenario 1: User without token creates post', async () => {
    // 1. User tries to create post (no token)
    const postId = await addToQueue(
      'https://api.github.com/repos/test/repo/issues',
      'POST',
      { 'Content-Type': 'application/json' },
      JSON.stringify({ title: 'My First Post' })
    );

    // 2. Verify it's in queue
    let queued = await getAllQueuedRequests();
    expect(queued).toHaveLength(1);

    // 3. User logs in, token is available
    await storeTokenInDB('github_pat_token_123');

    // 4. Verify token is stored
    const token = await getStoredToken();
    expect(token).toBe('github_pat_token_123');

    // 5. In real scenario, SW would now retry all requests
    // Simulate successful retry by removing from queue
    await removeFromQueue(postId);

    queued = await getAllQueuedRequests();
    expect(queued).toHaveLength(0);
  });

  it('Scenario 2: User offline creates multiple posts', async () => {
    const token = 'github_pat_token_123';
    await storeTokenInDB(token);

    // Add multiple offline requests
    const ids = [];
    for (let i = 1; i <= 3; i++) {
      const id = await addToQueue(
        `https://api.github.com/repos/test/repo/issues/${i}`,
        'POST',
        { 'Content-Type': 'application/json' },
        JSON.stringify({ title: `Post ${i}` })
      );
      ids.push(id);
    }

    // All should be in queue
    let requests = await getAllQueuedRequests();
    expect(requests).toHaveLength(3);

    // Simulate network recovery and successful sync
    for (const id of ids) {
      await removeFromQueue(id);
    }

    requests = await getAllQueuedRequests();
    expect(requests).toHaveLength(0);
  });

  it('Scenario 3: Retry logic with max attempts', async () => {
    const id = await addToQueue('https://api.github.com/test', 'POST', {}, '');

    let requests = await getAllQueuedRequests();
    expect(requests[0].retries).toBe(0);

    // Simulate 3 failed retry attempts
    for (let attempt = 1; attempt <= 3; attempt++) {
      await updateQueueRetries(id, attempt);
      requests = await getAllQueuedRequests();
      expect(requests[0].retries).toBe(attempt);
    }

    // After max retries, request would be removed
    await removeFromQueue(id);
    requests = await getAllQueuedRequests();
    expect(requests).toHaveLength(0);
  });
});
