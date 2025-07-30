# Design Document

## 1. Architecture

The `agent-rules` project is a command-line interface (CLI) tool built with TypeScript and Node.js. The architecture is designed to be modular and extensible, with a clear separation of concerns between the user interface and the core logic.

### 1.1. Architectural Style

The project follows a layered architecture:

- **Presentation Layer**: The CLI, which is responsible for user interaction.
- **Application Layer**: The core logic, which is responsible for orchestrating the generation of agentic rules.
- **Data Layer**: The file system, which is used to store the templates for the agentic rules.

### 1.2. High-Level Diagram

```
+----------------------------------------------------+
|                   Presentation Layer               |
|                                                    |
| +------------------------------------------------+ |
| |                    CLI (bin/cli.ts)            | |
| +------------------------------------------------+ |
|                                                    |
+----------------------------------------------------+
                         |
                         v
+----------------------------------------------------+
|                   Application Layer                |
|                                                    |
| +------------------------------------------------+ |
| |      Core Logic (src/main.ts)                  | |
| +------------------------------------------------+ |
|                                                    |
+----------------------------------------------------+
                         |
                         v
+----------------------------------------------------+
|                      Data Layer                    |
|                                                    |
| +------------------------------------------------+ |
| |      File System (__template__/*)              | |
| +------------------------------------------------+ |
|                                                    |
+----------------------------------------------------+
```

## 2. Components and Interfaces

### 2.1. `cli.ts`

- **Component**: The CLI entry point.
- **Responsibilities**: 
  - Parses command-line arguments.
  - Prompts the user for input using `@clack/prompts`.
  - Calls the core logic to generate the agentic rules.
  - Handles errors and displays appropriate messages to the user.
- **Interfaces**: Interacts with the `main.ts` module.

### 2.2. `main.ts`

- **Component**: The core logic of the application.
- **Responsibilities**:
  - Resolves the template directory based on the user's selections.
  - Creates the target directory for the generated files.
  - Copies the template files to the target directory.
- **Interfaces**: Exposes the `scaffoldAiAppInstructions` function to the `cli.ts` module.

### 2.3. `__template__`

- **Component**: The directory containing the templates for the agentic rules.
- **Responsibilities**: 
  - Stores the templates in a structured way.
- **Interfaces**: The `main.ts` module reads from this directory.

## 3. Data Models

### 3.1. `ScaffoldInstructions`

- **Description**: Represents the user's selections for generating agentic rules.
- **Type Definition**:

```typescript
type ScaffoldInstructions = {
  aiApp: string;
  codeLanguage: string;
  codeTopic: string;
}
```

### 3.2. `AiAppConfig`

- **Description**: Represents the configuration for a supported AI app.
- **Type Definition**:

```typescript
type AiAppConfig = {
  directory: string;
  filesSuffix: string;
}
```

## 4. APIs

### 4.1. `scaffoldAiAppInstructions(scaffoldInstructions: ScaffoldInstructions): Promise<void>`

- **Description**: The main function that orchestrates the generation of agentic rules.
- **Parameters**:
  - `scaffoldInstructions`: An object containing the user's selections.
- **Returns**: A promise that resolves when the operation is complete.
- **Throws**: An error if the operation fails.

## 5. Error Handling

- **User Cancellation**: The CLI should handle user cancellation gracefully by exiting the process without an error.
- **Invalid Input**: The CLI should validate user input and display an error message if the input is invalid.
- **File System Errors**: The application should handle file system errors, such as permission errors or missing files, by displaying an error message to the user.
- **Template Not Found**: The application should throw an error if the template directory cannot be found.

## 6. Testing Strategy

- **Unit Tests**: Unit tests should be written for the core logic in `main.ts` to ensure that it functions correctly in isolation.
- **Integration Tests**: Integration tests should be written to test the interaction between the CLI and the core logic.
- **End-to-End Tests**: End-to-end tests should be written to test the entire application from the command line.

## 7. Implementation Considerations

- **Extensibility**: The project should be designed to be extensible, so that new AI apps, programming languages, and topics can be added easily.
- **Maintainability**: The code should be well-documented and easy to understand, so that it can be maintained by other developers.
- **Security**: The project should be developed with security in mind, to prevent vulnerabilities such as path traversal attacks.
