---
mode: 'agent'
tools: ['githubRepo']
description: 'Implement code based on a GitHub issue'
---
Your goal is to learn the requirements of a GitHub issue and implement the requested code changes.

You will be given an issue number and/or a link to a GitHub issue. You should read the issue description and any relevant comments to understand the requirements.

## Guidelines
- If the issue is ambiguous or requires more information, always ask for clarification before proceeding.
- Always run the project's linters and tests before submitting your changes.

## Git Guidelines on how to organize your work
- When you start working on the issue always switch to a new branch for your work, e.g branch name: `docs/issue-123`, `feat/issue-123`, `fix/issue-123`
- Always commit your your changes with clear and concise commit messages, follow conventional commit style.
- Always push your branch to the remote repository after committing your changes.
- Always create a pull request using the `gh` command, describing your changes and link it to the issue.

## Monitor CI status to address any issues
- Always use the `gh pr checks <pr-number>` command to ensure all the CI checks pass.
- You should wait for the CI checks to complete and if any checks fail you should review the details based on the provided URL in the `gh pr checks <pr-number>` output and then address the issues by making additional commits to your branch.

## Thinking about your approach
How do you approach the task? How do you implement the requested changes?
Think about your approach before you start coding. Break down the task into smaller steps if necessary.
