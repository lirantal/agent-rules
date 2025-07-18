---
applyTo: "**/*.test.js,**/*.test.ts,**/*.spec.js,**/*.spec.ts,__tests__/**/*.js,__tests__/**/*.ts,test/**/*.js,test/**/*.ts"
---
 
# Testing Guidelines for Node.js applications test code

This document outlines the rules and guidelines for AI agents generating test code for modern Node.js applications.

## General Testing Principles

### Guiding Principles

1.  **Modern Node.js:** All test code must be compatible with Node.js version 22 and above.
2.  **Latest JavaScript:** Utilize the latest JavaScript features (ES2022 and beyond), including top-level `await` and modern syntax.
3.  **Built-in Tools:** Exclusively use the built-in Node.js test runner (`node:test`) and assertion library (`node:assert`). No third-party testing frameworks (e.g., Jest, Mocha, Chai) should be used.
4.  **ES Modules:** All code should be written using ES Modules (`import`/`export`). CommonJS (`require`) should be avoided.
5.  **Asynchronous Focus:** Tests should be written with an `async`-first mindset, effectively handling promises and asynchronous operations.
6.  **Clarity and Readability:** Tests should be easy to understand. Use descriptive names for `describe` blocks and `test` cases.

### Test Structure and Style

Tests should be organized using `describe` to group related tests and `test` for individual test cases.

#### Basic Structure

```javascript
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

// The module to be tested
import myModule from '../src/my-module.js';

describe('A group of tests for myModule', () => {
  test('an individual test case', async () => {
    // Test logic goes here
    assert.strictEqual(1, 1);
  });
});
```

#### Asynchronous Tests

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

### Assertions

Use the `node:assert/strict` module for all assertions. This ensures strict equality checks and avoids common pitfalls.

#### Common Assertions

*   `assert.strictEqual(actual, expected[, message])`: Tests for strict equality (`===`).
*   `assert.deepStrictEqual(actual, expected[, message])`: Tests for deep equality on objects and arrays.
*   `assert.ok(value[, message])`: Tests if `value` is truthy.
*   `assert.rejects(asyncFn[, error][, message])`: Tests if an `async` function throws an error.
*   `assert.throws(fn[, error][, message])`: Tests if a synchronous function throws an error.

### Mocking and Stubbing

Use the built-in mocking capabilities of `node:test` to isolate components and control dependencies.

#### Mocking Functions

```javascript
import { test, mock } from 'node:test';
import assert from 'node:assert/strict';

test('spies on a function', () => {
  const sum = mock.fn((a, b) => {
    return a + b;
  });

  assert.strictEqual(sum.mock.callCount(), 0);
  assert.strictEqual(sum(3, 4), 7);
  assert.strictEqual(sum.mock.callCount(), 1);

  const call = sum.mock.calls[0];
  assert.deepStrictEqual(call.arguments, [3, 4]);
  assert.strictEqual(call.result, 7);
});
```

#### Mocking Object Methods

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';

test('spies on an object method', (t) => {
  const number = {
    value: 5,
    add(a) {
      return this.value + a;
    },
  };

  t.mock.method(number, 'add');
  assert.strictEqual(number.add.mock.callCount(), 0);
  assert.strictEqual(number.add(3), 8);
  assert.strictEqual(number.add.mock.callCount(), 1);
});
```

### Setup and Teardown

Use `before`, `after`, `beforeEach`, and `afterEach` for setting up and tearing down test conditions.

```javascript
import { describe, test, before, after, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

describe('tests with hooks', () => {
  before(() => console.log('about to run some tests'));
  after(() => console.log('finished running tests'));
  beforeEach(() => console.log('about to run a test'));
  afterEach(() => console.log('finished running a test'));

  test('is a subtest', () => {
    assert.ok('some relevant assertion here');
  });
});
```

### Test Fixtures

For complex tests, especially for CLI tools or APIs, use a `fixtures` directory to store sample input files or data. This keeps your tests clean and focused on the logic being tested.

## Testing Web Servers and APIs

When testing web servers, start the server on a random port and use `fetch` to make requests to it.

```javascript
import { describe, test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';

describe('API tests', () => {
  let server;
  let port;

  before(async () => {
    await new Promise(resolve => {
      server = createServer((req, res) => {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ message: 'Hello, world!' }));
      }).listen(0, () => {
        port = server.address().port;
        resolve();
      });
    });
  });

  after(() => {
    server.close();
  });

  test('should return a 200 OK with a JSON payload', async () => {
    const response = await fetch(`http://localhost:${port}`);
    assert.strictEqual(response.status, 200);
    const body = await response.json();
    assert.deepStrictEqual(body, { message: 'Hello, world!' });
  });
});
```

## Testing Commands and CLI Tools

To test command-line tools, use `node:child_process` to execute the CLI and assert on its output. Use `util.promisify` to avoid callback-based APIs.

```javascript
import { exec } from 'node:child_process';
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { promisify } from 'node:util';
import path from 'node:path';

const execPromise = promisify(exec);

describe('CLI tool tests', () => {
  const cliPath = path.resolve('./my-cli.js');

  test('should output the correct version', async () => {
    const { stdout } = await execPromise(`node ${cliPath} --version`);
    assert.strictEqual(stdout.trim(), '1.0.0');
  });

  test('should output an error message for invalid input', async () => {
    try {
      await execPromise(`node ${cliPath} --invalid-command`);
    } catch (error) {
      assert.match(error.stderr, /Unknown command: --invalid-command/);
    }
  });
});
```
