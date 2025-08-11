
# Project Overview

This project, `agent-rules`, is a command-line interface (CLI) tool for generating agentic rules and instructions for various AI coding assistants. It allows users to scaffold security-focused instructions for AI apps like GitHub Copilot, tailored to specific programming languages and topics such as secure coding, vulnerability scanning, and testing.

The tool is built with TypeScript and packaged as a Node.js module. It provides an interactive CLI to prompt users for their desired AI app, programming language, and topic, then generates the corresponding instruction files in the appropriate directory.

## Development Commands

- **`npm start`**: Run the CLI in development mode without building.
- **`npm run build`**: Build the project, including compiling TypeScript and copying template files.
- **`npm test`**: Run the test suite.
- **`npm run lint`**: Lint the codebase.
- **`npm run lint:fix`**: Automatically fix linting issues.

## Tech Stack

- **Language**: TypeScript
- **Runtime**: Node.js
- **Build Tool**: `tsup`
- **Testing**: Node.js built-in test runner, `c8` for coverage
- **Linting**: ESLint with `neostandard` and `eslint-plugin-security`
- **CLI Prompts**: `@clack/prompts`
- **Package Manager**: npm

## General Project Architecture & Key Patterns

The project is structured as a monorepo with the following key components:

- **`src/`**: Contains the core application logic.
  - **`main.ts`**: The main orchestration module that handles template resolution, directory creation, and delegates AI app-specific processing to adapters.
  - **`bin/cli.ts`**: The CLI entry point. It uses `@clack/prompts` to interact with the user and then calls the `scaffoldAiAppInstructions` function from `main.ts`.
  - **`adapters/`**: Contains the adapter pattern implementation for AI app-specific logic.
    - **`base-adapter.ts`**: Abstract base class defining the adapter interface.
    - **`github-copilot-adapter.ts`**: GitHub Copilot-specific implementation.
    - **`adapter-registry.ts`**: Registry for managing adapter instances.
    - **`index.ts`**: Module exports for the adapters.
- **`__template__/`**: Contains the template files for the agentic rules, organized by programming language and topic.
- **`__tests__/`**: Contains the tests for the application, including unit tests for adapters and integration tests.
- **`.github/`**: Contains GitHub-related files, including workflows, issue templates, and the destination for the generated GitHub Copilot instructions.
- **Configuration Files**:
  - **`package.json`**: Defines project metadata, dependencies, and scripts.
  - **`tsconfig.json`**: Configures the TypeScript compiler.
  - **`tsup.config.ts`**: Configures the `tsup` build process.
  - **`eslint.config.js`**: Configures ESLint for code linting.

The project follows a modular architecture with an **adapter pattern** for AI app extensibility, ensuring clear separation between the CLI, core orchestration logic, and AI app-specific processing. This makes the code easier to maintain, test, and extend with new AI apps. The use of `tsup` for building ensures that the project can be distributed as both CommonJS and ES modules.