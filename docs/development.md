# Development

## Prerequisites

- Node.js compatible with this repository's packages and tooling.
- npm for dependency installation and scripts.

## Setup

```sh
npm install
```

## Common Commands

- `pnpm build` - builds the project.
- `pnpm lint` - runs lint checks.
- `pnpm test` - runs the test suite.

## Repository Notes

This repository is organized around the root package `agent-rules`.

## TypeScript Compatibility

The ESLint parser (`typescript-eslint`) currently supports TypeScript versions
below 6.1. Keep TypeScript on `~6.0.3`; Dependabot defers 6.1 and newer versions
until the parser supports them. Check the parser's peer dependency range and
validate installation, lint, build, and tests before widening both constraints.
Do not bypass peer dependency checks with `--force` or `--legacy-peer-deps`.
