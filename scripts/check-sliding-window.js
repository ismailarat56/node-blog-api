const assert = require('node:assert/strict');
const { createSlidingWindowLimiter } = require('../src/utils/sliding-window-limiter');

const limiter = createSlidingWindowLimiter({
	limit: 3,
	windowSeconds: 10,
});

const start = 1_000_000;

assert.equal(limiter.consume('a', start).allowed, true);
assert.equal(limiter.consume('a', start + 1000).allowed, true);
assert.equal(limiter.consume('a', start + 2000).allowed, true);

const blocked = limiter.consume('a', start + 3000);

assert.equal(blocked.allowed, false);
assert.equal(blocked.retryAfterSeconds, 7);

assert.equal(limiter.consume('b', start + 3000).allowed, true);

assert.equal(limiter.consume('a', start + 10000).allowed, true);

assert.equal(limiter.consume('a', start + 10500).allowed, false);

limiter.sweep(start + 30000);

assert.equal(limiter.size(), 0);

console.log('sliding window kontrolleri gecti');
