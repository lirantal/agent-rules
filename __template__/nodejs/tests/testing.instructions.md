---
applyTo: "**"
---

# Project Node.js test code

This document outlines the rules and guidelines for AI agents generating test code for modern Node.js applications. The goal is to produce descriptive, repeatable, and helpful tests that adhere to the latest standards and best practices.

## Guiding Principles

1.  **Modern Node.js:** All test code must be compatible with Node.js version 22 and above.
2.  **Latest JavaScript:** Utilize the latest JavaScript features (ES2022 and beyond), including top-level `await` and modern syntax.
3.  **Built-in Tools:** Exclusively use the built-in Node.js test runner (`node:test`) and assertion library (`node:assert`). No third-party testing frameworks (e.g., Jest, Mocha, Chai) should be used.
4.  **ES Modules:** All code should be written using ES Modules (`import`/`export`). CommonJS (`require`) should be avoided.
5.  **Asynchronous Focus:** Tests should be written with an `async`-first mindset, effectively handling promises and asynchronous operations.
6.  **Clarity and Readability:** Tests should be easy to understand. Use descriptive names for `describe` blocks and `test` cases.

## Test Structure and Style

Tests should be organized using `describe` to group related tests and `test` for individual test cases.

### Basic Structure

```javascript
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { promisify } from 'node:util';

// The module to be tested
import hwp from '..';

const immediate = promisify(setImmediate);

describe('A group of tests', () => {
  test('an individual test case', async () => {
    // Test logic goes here
    assert.strictEqual(1, 1);
  });
});
```

### Asynchronous Tests

Always use `async`/`await` for asynchronous tests.

```javascript
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

describe('Async operations', () => {
  test('should resolve a promise', async () => {
    const result = await Promise.resolve(42);
    assert.strictEqual(result, 42);
  });
});
```

### Error Handling

Use `assert.rejects` to test for expected errors in asynchronous functions and `assert.throws` for synchronous functions.

```javascript
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

describe('Error handling', () => {
  test('should reject with an error', async () => {
    const asyncOperation = async () => {
      throw new Error('Something went wrong');
    };
    await assert.rejects(asyncOperation, {
      message: 'Something went wrong'
    });
  });

  test('should throw a synchronous error', () => {
    const syncOperation = () => {
      throw new Error('This is a sync error');
    };
    assert.throws(syncOperation, {
      message: 'This is a sync error'
    });
  });
});
```

## Assertions

Use the `node:assert/strict` module for all assertions. This ensures strict equality checks and avoids common pitfalls.

### Common Assertions

*   `assert.strictEqual(actual, expected[, message])`: Tests for strict equality (`===`).
*   `assert.deepStrictEqual(actual, expected[, message])`: Tests for deep equality on objects and arrays.
*   `assert.ok(value[, message])`: Tests if `value` is truthy.
*   `assert.rejects(asyncFn[, error][, message])`: Tests if an `async` function throws an error.
*   `assert.throws(fn[, error][, message])`: Tests if a synchronous function throws an error.

## Code Examples

### Testing an Asynchronous Iterator

```javascript
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import hwp from '..';

describe('forEach tests', () => {
  test('process an async iterator', async () => {
    const expected = ['a', 'b', 'c'];

    async function* something() {
      const toSend = [...expected];
      yield* toSend;
    }

    await hwp.forEach(something(), async function(item) {
      assert.equal(item, expected.shift());
    });
  });
});
```
