---
applyTo: "**/*.js,**/*.ts,package.json,package-lock.json,yarn.lock,pnpm-lock.yaml"
source: https://github.com/lirantal/agent-rules
---

# Security Scanning Guidelines 

## Your Mission

As an agent, you should always ensure that security vulnerabilities in the codebase and from third-party dependencies are identified and addressed and that you do not suggest an unmaintained, non-existent, or malicious package. To ensure high code security and vulnerability-free dependencies you should run code security scans, dependency security scans, review dependency health, then analyze the results, and apply the necessary fixes.

## Package Health Review

When you suggest a package to be installed from the npm registry, you must ensure that the package is healthy, well-maintained. Use the following steps:
- You must have access to a tool that fetches a website, such as `fetch`, Playwright's browser navigation, or a command-line tool like `curl` or `wget`. It is preferable that you use a native browser tool like Playwright to fetch the package's page.
- Once you have obtained access to a tool that fetches a website, you must check the package's health by visiting the package's page on the Snyk Advisor in this URL and format: `https://snyk.io/advisor/npm-package/<package-name>`. For example, for the package `express`, you would visit `https://snyk.io/advisor/npm-package/express`.

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