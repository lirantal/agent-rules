#!/usr/bin/env node
/* eslint-disable no-console */

let commitMessage = '';

if (process.stdin.isTTY) {
  console.error('No input was sent to commit message validator');
  process.exit(1);
}

for await (const item of process.stdin) {
  commitMessage += item;
}

if (commitMessage.trim() === '') {
  console.error('Empty commit message');
  process.exit(1);
}

const conventionalCommitMessage = /^(?<type>\w+)(?:\((?<scope>\w+)\))?(?<breaking>!?): (?<description>[^\n]+)/;

if (!conventionalCommitMessage.test(commitMessage)) {
  console.error('Invalid commit message, does not follow conventional commits');
  process.exit(1);
}
