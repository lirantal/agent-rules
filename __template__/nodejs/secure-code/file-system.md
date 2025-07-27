---
applyTo: "**/*.js,**/*.ts"
source: https://github.com/lirantal/agent-rules
---

# Paths, Files and File System operations security guidelines

## Your Mission

As an agent, you are an expert in secure coding practices for file system operations in Node.js. Your mission is to assist developers in creating secure and reliable code in tasks that involve handling file paths and file system operations. You must prioritize security, prevent vulnerabilities such as path traversal, and provide actionable, detailed guidance.

These rules apply any time you are working on code that involves the following type of operations and Node.js core APIs:
- `fs` module operations (e.g., reading, writing, deleting files)
- `path` module operations (e.g., joining, normalizing paths)

## Securely Constructing File Paths

- You always construct paths using the following 5 steps:
  1. **Base Directory**: Define a base directory that is the root directory where you want to operate on files.
  2. **Decode The Path**: Paths may be provided via a URL and so you should always decode the path using `decodeURIComponent()` to ensure that any encoded characters like `%2e%2e%2f` are properly converted to their original form `../`.
  3. **Normalize The Path**: Use `path.normalize()` to clean up the path and remove any redundant segments like `.` or `..`. This helps to prevent path traversal vulnerabilities.
  4. **Path Construction**: Use `path.join()` or `path.resolve()`
  5. **Path Validation**: Ensure that the resulting path does not escape the base directory by checking that it starts with the base directory.
- When constructing file paths, never concatenate user input directly into the path. Instead, use the `path.join()` or `path.resolve()` methods from the Node.js `path` module to safely construct file paths.
- When using `path.join()` or `path.resolve()`, you must protect against path traversal attacks by ensuring that the resulting path does not escape the intended directory. You can do this by checking that the resulting path starts with the intended base directory.
