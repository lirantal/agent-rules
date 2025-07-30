
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

**Capability:** The CLI must allow users to select from a list of supported AI coding assistants.

**Acceptance Criteria:**

- The CLI must display a list of supported AI apps.
- The user must be able to select one AI app from the list.
- The CLI must validate the user's selection.
- The CLI must throw an error if an unsupported AI app is selected.

### Topic Selection

**Capability:** The CLI must allow users to select one or more topics for which to generate agentic rules.

**Acceptance Criteria:**

- The CLI must display a list of available topics.
- The user must be able to select one or more topics from the list.
- The CLI must validate the user's selection.

### Rule Generation

**Capability:** The CLI must generate the agentic rule files based on the user's selections.

**Acceptance Criteria:**

- The CLI must create the target directory for the generated files if it does not already exist.
- The CLI must copy the relevant template files to the target directory.
- The generated files must have the correct file names and extensions.
- The content of the generated files must be identical to the content of the template files.

### Template Management

**Capability:** The project must provide a way to manage the templates for the agentic rules.

**Acceptance Criteria:**

- The templates must be organized in a directory structure based on programming language and topic.
- The project must be able to resolve the correct template directory based on the user's selections.
- The project must throw an error if the template directory cannot be found.
