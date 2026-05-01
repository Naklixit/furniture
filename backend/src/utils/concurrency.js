/**
 * Shared async and concurrency utilities
 * Centralizes duplicated async patterns from controllers
 */

/**
 * Map over array with concurrency limit
 * Applies async function to each item with max concurrent operations
 * @param {Array} arr - Array to map
 * @param {number} limit - Max concurrent operations
 * @param {Function} mapper - Async mapper function (item, index) => Promise
 * @returns {Promise<Array>} Results in original order
 */
const mapLimit = async (arr, limit, mapper) => {
  const list = Array.isArray(arr) ? arr : [];
  const size = list.length;
  if (size === 0) return [];

  const concurrency = Math.max(1, Math.min(Number(limit) || 1, size));
  const results = new Array(size);
  let nextIndex = 0;

  const workers = Array.from({ length: concurrency }).map(async () => {
    while (true) {
      const current = nextIndex;
      nextIndex += 1;
      if (current >= size) break;
      results[current] = await mapper(list[current], current);
    }
  });

  await Promise.all(workers);
  return results;
};

/**
 * Batch process items with pause between batches
 * Useful for rate-limiting external API calls
 * @param {Array} items - Items to process
 * @param {number} batchSize - Items per batch
 * @param {number} delayMs - Delay between batches
 * @param {Function} processor - Async processor (batch) => Promise
 * @returns {Promise<Array>} Flattened results
 */
const batchProcess = async (items, batchSize, delayMs, processor) => {
  const results = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await processor(batch);
    results.push(
      ...(Array.isArray(batchResults) ? batchResults : [batchResults]),
    );
    if (i + batchSize < items.length) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  return results;
};

/**
 * Retry async operation with exponential backoff
 * @param {Function} fn - Async function to retry
 * @param {number} maxAttempts - Max retry attempts (default: 3)
 * @param {number} baseDelayMs - Initial delay in ms (default: 1000)
 * @returns {Promise} Result of successful execution
 */
const retryWithBackoff = async (fn, maxAttempts = 3, baseDelayMs = 1000) => {
  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < maxAttempts) {
        const delay = baseDelayMs * Math.pow(2, attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
};

module.exports = {
  mapLimit,
  batchProcess,
  retryWithBackoff,
};
