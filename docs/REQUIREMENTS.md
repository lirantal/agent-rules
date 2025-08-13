
# Product Requirements Document (PRD)

## Introduction

This document outlines the product requirements for the `agent-rules` CLI tool. This tool is designed to help developers generate agentic rules and instructions for various AI coding assistants. By providing a simple command-line interface, it streamlines the process of setting up security-focused guidelines for AI-powered development workflows.

## Project Goal

The primary goal of the `agent-rules` project is to provide a simple and efficient way for developers to generate and manage agentic rules for AI coding assistants. This helps ensure that AI-assisted coding adheres to security best practices and organizational standards.

## Dependencies

The project has the following key dependencies:

- **Node.js**: The runtime environment for the CLI.
- **@clack/prompts**: A library for building interactive command-line prompts.
- **TypeScript**: The programming language used for development.
- **tsup**: A tool for bundling TypeScript libraries.

## Functional Requirements

### CLI Application

**Capability:** The project must provide a command-line interface (CLI) that allows users to generate agentic rules for AI coding assistants.

**Acceptance Criteria:**

- The CLI must be executable from the command line.
- The CLI must present an interactive prompt to the user.
- The CLI must guide the user through the process of selecting an AI app, a programming language, and a topic.
- The CLI must handle user cancellation gracefully.
- The CLI must display a confirmation message upon successful completion.
- The CLI must display an error message if the operation fails.

### AI App Selection

**Capability:** The CLI must allow users to select from a list of supported AI coding assistants, with support managed through an extensible adapter system.

**Acceptance Criteria:**

- The CLI must display a list of supported AI apps from the adapter registry.
- The user must be able to select one AI app from the list.
- The CLI must validate the user's selection against the adapter registry.
- The CLI must throw an error if an unsupported AI app is selected.
- The system must support adding new AI apps through the adapter pattern without modifying core logic.

### Topic Selection

**Capability:** The CLI must allow users to select one or more topics for which to generate agentic rules.

**Acceptance Criteria:**

- The CLI must display a list of available topics.
- The user must be able to select one or more topics from the list.
- The CLI must validate the user's selection.

### Rule Generation

**Capability:** The CLI must generate the agentic rule files based on the user's selections using AI app-specific adapters.

**Acceptance Criteria:**

- The CLI must create the target directory for the generated files if it does not already exist.
- The system must delegate processing to the appropriate AI app adapter based on user selection.
- Each adapter must implement secure file operations following the 5-step path validation process.
- The generated files must have the correct file names and extensions as defined by the AI app adapter.
- The content of the generated files must be processed according to the AI app's specific requirements.

### Template Management

**Capability:** The project must provide a way to manage the templates for the agentic rules with support for extensible AI app-specific processing.

**Acceptance Criteria:**

- The templates must be organized in a directory structure based on programming language and topic.
- The project must be able to resolve the correct template directory based on the user's selections.
- The project must throw an error if the template directory cannot be found.
- Each AI app adapter must be able to process templates according to its specific requirements.
- The system must support different processing strategies per AI app (e.g., direct copy, transformation, etc.).

### Main Context File Management

**Capability:** The project must support AI apps that require main context files with automatic import management.

**Acceptance Criteria:**

- The system must be able to create and update main context files (e.g., `CLAUDE.md`) at the project root.
- The system must support @ import syntax for referencing template files (e.g., `@./.claude/rules/filename.md`).
- The system must organize imports by topic categories with user-friendly labels.
- The system must implement duplicate detection to avoid redundant imports when processing the same topic multiple times.
- The system must preserve existing content in main context files while appending new imports.
- The system must support both creation of new main context files and updating of existing ones.

### Template Frontmatter Processing

**Capability:** The project must support advanced frontmatter processing to transform template metadata for different AI app requirements.

**Acceptance Criteria:**

- The system must parse YAML frontmatter in markdown template files using AST-based parsing for reliability.
- The system must support field transformation (e.g., converting `applyTo` to `globs` for Cursor compatibility).
- The system must preserve all non-transformed frontmatter fields exactly as they appear in the source.
- The system must use structured YAML parsing and serialization to maintain data integrity and formatting.
- The system must gracefully handle malformed YAML frontmatter with appropriate fallback mechanisms.
- The system must maintain proper markdown structure and formatting in the output files.
- Each adapter must be able to implement its own frontmatter transformation logic as needed.

### Adapter System

**Capability:** The project must provide an extensible adapter system for supporting multiple AI coding assistants.

**Acceptance Criteria:**

- The system must implement a base adapter interface that all AI app adapters must follow.
- Each adapter must handle AI app-specific configuration (directory structure, file naming, etc.).
- The adapter registry must manage the mapping between AI app identifiers and their corresponding adapters.
- New AI apps must be addable by creating new adapter classes without modifying existing core logic.
- All adapters must implement secure file system operations to prevent security vulnerabilities.
- The system must validate that AI app adapters implement the required interface correctly.
- Adapters must be able to implement custom template processing, including frontmatter transformation when required.
