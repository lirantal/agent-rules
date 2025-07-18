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

Use the built-in mocking capabilities of `node:test` to isolate components and control dependencies. The `t.mock.method()` function is a powerful tool for replacing the implementation of a method on any object, including imported modules.

#### Mocking Module Methods

A common use case is to mock dependencies that are imported from other modules. This allows you to control their behavior and prevent external calls (e.g., to APIs or file systems) during tests.

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';

// Assume these are external modules with functions we need to mock.
import * as setupGcloud from '@google-github-actions/setup-cloud-sdk';
import * as exec from '@actions/exec';

// This is the function we want to test.
import { run } from '../src/main.js';

test('should use cached gcloud SDK if already installed', async (t) => {
  // Mock the functions from the imported modules.
  t.mock.method(setupGcloud, 'isInstalled', () => true);
  const installGcloudSDKMock = t.mock.method(setupGcloud, 'installGcloudSDK');
  t.mock.method(exec, 'getExecOutput', async () => ({ exitCode: 0, stdout: '{}' }));

  await run();

  // Assert that the mocked function was NOT called.
  assert.strictEqual(installGcloudSDKMock.mock.callCount(), 0);
});
```

#### Centralized Mocking with Helper Functions

For test suites with many shared dependencies, creating a helper function to set up all the default mocks can significantly reduce boilerplate and improve readability.

```javascript
import { mock } from 'node:test';
import * as core from '@actions/core';
import * as exec from '@actions/exec';

// A helper function that sets up all common mocks.
const setupMocks = (t, overrideInputs = {}) => {
  const inputs = { ...overrideInputs };

  return {
    getInput: t.mock.method(core, 'getInput', (name) => inputs[name]),
    getExecOutput: t.mock.method(exec, 'getExecOutput', async () => ({
      exitCode: 0,
      stderr: '',
      stdout: '{}',
    })),
    // ... other common mocks
  };
};

test('should set the project ID flag when a project_id is provided', async (t) => {
  const mocks = setupMocks(t, { project_id: 'my-test-project' });

  await run(); // The function being tested.

  // Check if the mocked `getExecOutput` was called with the correct arguments.
  const firstCall = mocks.getExecOutput.mock.calls[0];
  assert.ok(firstCall.arguments[1].includes('--project'));
  assert.ok(firstCall.arguments[1].includes('my-test-project'));
});
```

### Setup and Teardown

Use `before`, `after`, `beforeEach`, and `afterEach` for setting up and tearing down test conditions. These "hooks" are essential for managing resources like temporary files or database connections, ensuring that each test runs in a clean, isolated environment.

The `suite` object, available in the `test` function's callback, is a great way to apply hooks to a specific group of tests.

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'fs/promises';
import * as path from 'path';

test('File system operations', { concurrency: true }, async (suite) => {
  let tempDir;

  // Create a temporary directory before each test in this suite.
  suite.beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join('test-fixtures-'));
  });

  // Clean up the temporary directory after each test.
  suite.afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  suite.test('should write a file to the temp directory', async () => {
    const filePath = path.join(tempDir, 'my-file.txt');
    await fs.writeFile(filePath, 'hello world');
    const content = await fs.readFile(filePath, 'utf-8');
    assert.strictEqual(content, 'hello world');
  });
});
```

### Data-Driven (Table-Driven) Tests

For functions that need to be tested with a variety of different inputs, a data-driven or table-driven approach is highly effective. This pattern involves creating an array of test cases, where each case defines the inputs and the expected outcome. You then loop over the array and run a sub-test for each case. This makes your tests concise, readable, and easy to extend.

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseDeliverables } from '../src/main.js';

test('#parseDeliverables', async (suite) => {
  const cases = [
    { name: 'empty string', input: '', expected: [] },
    { name: 'single value', input: 'app.yaml', expected: ['app.yaml'] },
    { name: 'space-separated values', input: 'app.yaml foo.yaml', expected: ['app.yaml', 'foo.yaml'] },
    { name: 'comma-separated values', input: 'app.yaml, foo.yaml', expected: ['app.yaml', 'foo.yaml'] },
    { name: 'mixed separators and newlines', input: 'app.yaml,\nfoo.yaml,   bar.yaml', expected: ['app.yaml', 'foo.yaml', 'bar.yaml'] },
  ];

  for (const tc of cases) {
    await suite.test(tc.name, () => {
      const result = parseDeliverables(tc.input);
      assert.deepStrictEqual(result, tc.expected);
    });
  }
});
```

### Test Fixtures

For complex tests, especially for CLI tools or APIs, use a `fixtures` directory to store sample input files or data. This keeps your tests clean and focused on the logic being tested.

```

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

To test command-line tools, use `node:child_process` to execute the CLI and assert on its output. For asynchronous operations where you need to capture streamed output or handle more complex interactions, using `exec` with `util.promisify` is a solid approach.

```javascript
import { exec } from 'node:child_process';
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { promisify } from 'node:util';
import path from 'node:path';

const execPromise = promisify(exec);

describe('CLI tool tests with exec', () => {
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

Alternatively, for synchronous command execution, `spawnSync` provides a more direct API. This is particularly useful for testing specific exit codes and exact output without needing `try/catch` blocks for error cases.

When asserting on `stdout` or `stderr`, it's a good practice to use `node:util.stripVTControlCharacters` to remove any ANSI escape codes (e.g., for color) from the output. This makes assertions more robust.

```javascript
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { stripVTControlCharacters } from 'node:util';

test('should exit with status 0 for valid input', () => {
  // Assuming 'my-cli' is an executable command.
  // The arguments are passed as an array.
  const { status, stderr } = spawnSync('my-cli', ['--frail', 'input.txt']);

  assert.equal(status, 0);
  assert.equal(stripVTControlCharacters(String(stderr)), 'input.txt: no issues found\n');
});

test('should exit with status 1 for linting errors', () => {
  const { status, stderr } = spawnSync('my-cli', ['lint-error-fixture.txt']);

  assert.equal(status, 1);
  assert.equal(
    stripVTControlCharacters(String(stderr)),
    'lint-error-fixture.txt\n' +
      '3:1-3:25 warning Some lint warning\n' +
      '\n' +
      '⚠ 1 warning\n'
  );
});
```
