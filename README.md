<!-- markdownlint-disable -->

<p align="center"><h1 align="center">
  agent-rules
</h1>

<p align="center">
  Rules and instructions for agentic coding tools like Cursor, GitHub Copilot, Claude CLI, Gemini CLI, Qodo, Cline and more
</p>

<p align="center">
  <a href="https://www.npmjs.org/package/agent-rules"><img src="https://badgen.net/npm/v/agent-rules" alt="npm version"/></a>
  <a href="https://www.npmjs.org/package/agent-rules"><img src="https://badgen.net/npm/license/agent-rules" alt="license"/></a>
  <a href="https://www.npmjs.org/package/agent-rules"><img src="https://badgen.net/npm/dt/agent-rules" alt="downloads"/></a>
  <a href="https://github.com/lirantal/agent-rules/actions?workflow=CI"><img src="https://github.com/lirantal/agent-rules/workflows/CI/badge.svg" alt="build"/></a>
  <a href="https://codecov.io/gh/lirantal/agent-rules"><img src="https://badgen.net/codecov/c/github/lirantal/agent-rules" alt="codecov"/></a>
  <a href="https://snyk.io/test/github/lirantal/agent-rules"><img src="https://snyk.io/test/github/lirantal/agent-rules/badge.svg" alt="Known Vulnerabilities"/></a>
  <a href="./SECURITY.md"><img src="https://img.shields.io/badge/Security-Responsible%20Disclosure-yellow.svg" alt="Responsible Disclosure Policy" /></a>
</p>

<div align="center">
  <img src="https://github.com/lirantal/agent-rules/blob/main/.github/agent-rules-1.png?raw=true" alt="agent-rules logo"/>
</div>

## Usage

### Interactive Mode

```bash
npx agent-rules
```

This will start an interactive session where you can select the AI app and topics.

### Command Line Interface

You can also use command line flags to skip the interactive prompts:

```bash
# Generate rules for a specific AI app and topic
npx agent-rules --app cursor --topics secure-code

# Generate rules for multiple topics
npx agent-rules --app github-copilot --topics secure-code --topics testing

# Use short flags
npx agent-rules -a claude-code -t security-vulnerabilities

# Show help
npx agent-rules --help

# Show version
npx agent-rules --version
```

#### Available Options

**AI Apps:**
- `github-copilot` - GitHub Copilot
- `cursor` - Cursor
- `claude-code` - Claude Code

**Topics:**
- `secure-code` - Secure coding practices
- `security-vulnerabilities` - Security vulnerability scanning and fixes
- `testing` - Testing strategy and guidelines

## Rules

Current category of rules available:

- Secure coding practices, based on Liran Tal's [Node.js Secure Coding](https://www.nodejs-security.com/)
- Security vulnerabilities, based on [Snyk.io](https://snyk.io/)
- Testing strategy and test code guidelines, built from [Yoni Goldberg's JavaScript Testing](https://github.com/goldbergyoni/javascript-testing-best-practices) and Liran Tal's testing strategy

## Contributing

Please consult [CONTRIBUTING](./.github/CONTRIBUTING.md) for guidelines on contributing to this project.

## Author

**agent-rules** © [Liran Tal](https://github.com/lirantal), Released under the [Apache-2.0](./LICENSE) License.