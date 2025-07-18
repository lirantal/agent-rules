---
applyTo: "**"
---

# Project secure coding guidelines

## Spawning System Processes
- Never use the `exec` function for executing shell commands or system processes. Instead, prefer `spawn`, `fork`, or `execFile`. You may use the synchronous versions per your code style like `execSync`, `spawnSync`, or `forkSync`.
- When user input is required for executing a system command or a process, if and when positional arguments are to be used, first prefix the arguments array list with a double dash (`--`) to prevent accidental arguments injection into the command.