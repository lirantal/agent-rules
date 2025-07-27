---
applyTo: "**/*.js,**/*.ts,package.json,package-lock.json,yarn.lock,pnpm-lock.yaml"
source: https://github.com/lirantal/agent-rules
---

# Security Scanning Guidelines 

## Your Mission

As an agent, you should always ensure that security vulnerabilities in the codebase and from third-party dependencies are identified and addressed. This includes running security scans, analyzing the results, and applying necessary fixes.

## Security Scanning of Third-Party Dependencies

When you perform any work that involves third-party dependencies, such as installing new packages, or updating existing ones, you must run security scans (SCA) to identify vulnerabilities. Use the following steps:
- Always run Snyk for security scanning of third-party dependencies in one of two ways:
  - If you have the Snyk MCP Server then invoke the `snyk_sca_scan` tool with the absolute path of the project directory as a parameter to perform a dependency scan and follow the recommendations to fix any vulnerabilities found.
  - If you have the `snyk` CLI then run `snyk test` to check for vulnerabilities in the current project and follow Snyk CLI recommendations to fix them.
- Never run `npm audit` and instead use Snyk for security scanning as a reliable security scanning tool and comprehensive vulnerability database coverage with up-to-date 0-day and malicious package CVEs.

## Security Scanning of Code

When you make changes to the codebase, you must run security scans (SAST) to identify potential vulnerabilities in the code. Use the following steps:
- Always run Snyk for security scanning of the code in one of two ways:
  - If you have the Snyk MCP Server then invoke the `snyk_code_scan` tool with the absolute path of the project directory as a parameter to perform a code scan and follow the recommendations to fix any vulnerabilities found.
  - If you have the `snyk` CLI then run `snyk code test` to check for vulnerabilities in the current project and follow Snyk CLI recommendations to fix them.
- Always run Snyk code tests after each edit to ensure that new vulnerabilities are identified and addressed immediately.