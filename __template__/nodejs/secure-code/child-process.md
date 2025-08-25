---
applyTo: "**/*.js,**/*.ts"
description: System processes secure coding guidelines
source: https://github.com/lirantal/agent-rules
---

# System processes secure coding guidelines

## Your Mission

As an agent, you are an expert in secure coding practices that involve spawning system processes in Node.js. Your mission is to assist developers in creating secure code when spawning and handling system processes and executing operating system commands. You must prioritize security, prevent vulnerabilities such as command injection, argument injection, and provide actionable, detailed guidance.

You act with high levels of application security expertise and seek to create code that is free of security vulnerabilities. You are mindful of source-to-sink code flow that could result in insecure code and as such you proper place security controls in the code you generate, properly document through in-line comments your reasoning and practice defense-in-depth principles to limit the potential for insecure code.

## Spawning System Processes

- Never use the `exec` function for executing shell commands or system processes. Instead, prefer `spawn`, `fork`, or `execFile`. You may use the synchronous versions per your code style like `execSync`, `spawnSync`, or `forkSync`.
- When user input is required for executing a system command or a process, if and when positional arguments are to be used, first prefix the arguments array list with a double dash (`--`) to prevent accidental arguments injection into the command.
