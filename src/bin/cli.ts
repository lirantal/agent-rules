#!/usr/bin/env node

import { intro, outro, select, multiselect } from '@clack/prompts'
import { styleText, debuglog, parseArgs } from 'node:util'
import { readFile } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { scaffoldAiAppInstructions } from '../main.js'
import { AdapterRegistry } from '../adapters/index.js'

const debug = debuglog('agent-rules')

// Available options for validation
const AVAILABLE_TOPICS = ['secure-code', 'security-vulnerabilities', 'testing', 'nodejs-dev']
const AVAILABLE_APPS = AdapterRegistry.getSupportedAiApps()

interface CliArgs {
  app?: string
  topics?: string[]
  mcp?: boolean
  commands?: boolean
  help?: boolean
  version?: boolean
}

function parseCommandLineArgs (): CliArgs {
  try {
    const { values } = parseArgs({
      args: process.argv.slice(2),
      options: {
        app: {
          type: 'string',
          short: 'a'
        },
        topics: {
          type: 'string',
          multiple: true,
          short: 't'
        },
        mcp: {
          type: 'boolean',
          short: 'm'
        },
        commands: {
          type: 'boolean',
          short: 'c'
        },
        help: {
          type: 'boolean',
          short: 'h'
        },
        version: {
          type: 'boolean',
          short: 'v'
        }
      },
      allowPositionals: false
    })

    return {
      app: values.app,
      topics: values.topics,
      mcp: values.mcp,
      commands: values.commands,
      help: values.help,
      version: values.version
    }
  } catch (error: any) {
    console.error('Error parsing command line arguments:', error.message)
    showHelp()
    // eslint-disable-next-line n/no-process-exit
    process.exit(1)
  }
}

function showHelp (): void {
  console.log(`
Usage: agent-rules [options]

Options:
  -a, --app <app>         AI app to generate rules for (${AVAILABLE_APPS.join(', ')})
  -t, --topics <topics>   Topics to generate rules for (${AVAILABLE_TOPICS.join(', ')})
                          Can be specified multiple times: --topics secure-code --topics testing
  -m, --mcp               Include MCP (Model Context Protocol) server configuration
  -c, --commands          Include custom commands
  -h, --help              Show this help message
  -v, --version           Show version number

Examples:
  agent-rules                                    # Interactive mode
  agent-rules --app cursor --topics secure-code  # Generate secure coding rules for Cursor
  agent-rules -a github-copilot -t testing -t secure-code # Multiple topics
  agent-rules --app gemini --topics testing --mcp # Include MCP configuration
  agent-rules --app github-copilot --topics secure-code --commands # Include commands

Available AI Apps: ${AVAILABLE_APPS.join(', ')}
Available Topics: ${AVAILABLE_TOPICS.join(', ')}
`)
}

async function showVersion (): Promise<void> {
  try {
    const __filename = fileURLToPath(import.meta.url)
    const __dirname = dirname(__filename)
    const packageJsonPath = resolve(__dirname, '../../package.json')
    const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf-8'))
    console.log(packageJson.version)
  } catch (error) {
    console.error('Error reading version:', error)
    // eslint-disable-next-line n/no-process-exit
    process.exit(1)
  }
}

function validateCliArgs (args: CliArgs): void {
  if (args.app && !AVAILABLE_APPS.includes(args.app)) {
    console.error(`Error: Invalid app "${args.app}". Available apps: ${AVAILABLE_APPS.join(', ')}`)
    // eslint-disable-next-line n/no-process-exit
    process.exit(1)
  }

  if (args.topics) {
    const invalidTopics = args.topics.filter(topic => !AVAILABLE_TOPICS.includes(topic))
    if (invalidTopics.length > 0) {
      console.error(`Error: Invalid topics "${invalidTopics.join(', ')}". Available topics: ${AVAILABLE_TOPICS.join(', ')}`)
      // eslint-disable-next-line n/no-process-exit
      process.exit(1)
    }
  }

  // If one CLI arg is provided, both should be provided for non-interactive mode
  if ((args.app && !args.topics) || (!args.app && args.topics)) {
    console.error('Error: When using command line flags, both --app and --topics must be specified')
    showHelp()
    // eslint-disable-next-line n/no-process-exit
    process.exit(1)
  }
}

async function initInteractive () {
  intro(styleText(['bgMagentaBright', 'black'], ' Agent, rules!'))

  // Hard-coding the code language for now
  const codeLanguage = 'nodejs'
  debug('Selected code language:', codeLanguage)

  const aiApp = await select({
    message: 'Which AI App would you like to generate agentic rules for?',
    options: [
      { value: 'claude-code', label: 'Claude Code' },
      { value: 'github-copilot', label: 'GitHub Copilot' },
      { value: 'cursor', label: 'Cursor' },
    ],
    initialValue: 'github-copilot',
  })

  // Handle cancellation
  if (typeof aiApp === 'symbol') {
    throw new Error('Operation cancelled by user')
  }

  debug('Selected AI App:', aiApp)

  const topicChoices = await multiselect({
    message: 'Which topic do you want to generate agentic rules for?',
    options: [
      { value: 'nodejs-dev', label: 'Node.js Development', hint: 'General best practices for Node.js application development' },
      { value: 'secure-code', label: 'Secure Coding', hint: 'Apply security best practices for defensive coding in Node.js' },
      { value: 'security-vulnerabilities', label: 'Security Vulnerabilities', hint: 'Scan and fix security vulnerabilities in Node.js application code and 3rd-party dependencies' },
      { value: 'testing', label: 'Testing', hint: 'Establish mature testing strategy and test code guidelines in Node.js applications' },
    ],
    required: true
  })

  // Handle cancellation
  if (typeof topicChoices === 'symbol') {
    throw new Error('Operation cancelled by user')
  }

  debug('Selected code topic: ', topicChoices.join(', '))

  const includeMcp = await select({
    message: 'Include MCP server configuration?',
    options: [
      { value: true, label: 'Yes', hint: 'Add recommended MCP servers for improved agentic coding' },
      { value: false, label: 'No', hint: 'Skip MCP configuration' }
    ],
    initialValue: false
  })

  // Handle cancellation
  if (typeof includeMcp === 'symbol') {
    throw new Error('Operation cancelled by user')
  }

  debug('Include MCP configuration:', includeMcp)

  const includeCommands = await select({
    message: 'Include custom commands?',
    options: [
      { value: true, label: 'Yes', hint: 'Add custom commands for this AI app' },
      { value: false, label: 'No', hint: 'Skip commands configuration' }
    ],
    initialValue: false
  })

  // Handle cancellation
  if (typeof includeCommands === 'symbol') {
    throw new Error('Operation cancelled by user')
  }

  debug('Include commands configuration:', includeCommands)

  for (const codeTopic of topicChoices) {
    const templateChoices = {
      aiApp: aiApp as string,
      codeLanguage,
      codeTopic: codeTopic as string,
      includeMcp: includeMcp as boolean,
      includeCommands: includeCommands as boolean
    }

    await scaffoldAiAppInstructions(templateChoices)
  }

  outro('Aye Captain, godspeed with yar vibe coding 🫡')
}

async function initWithCliArgs (args: CliArgs) {
  // Hard-coding the code language for now
  const codeLanguage = 'nodejs'

  debug('CLI mode - Selected AI App:', args.app)
  debug('CLI mode - Selected code topics:', args.topics?.join(', '))
  debug('CLI mode - Include MCP configuration:', args.mcp)
  debug('CLI mode - Include commands configuration:', args.commands)

  for (const codeTopic of args.topics!) {
    const templateChoices = {
      aiApp: args.app!,
      codeLanguage,
      codeTopic,
      includeMcp: args.mcp || false,
      includeCommands: args.commands || false
    }

    await scaffoldAiAppInstructions(templateChoices)
  }

  console.log('✅ Agent rules generated successfully!')
}

async function init () {
  const args = parseCommandLineArgs()

  // Handle help and version flags
  if (args.help) {
    showHelp()
    return
  }

  if (args.version) {
    await showVersion()
    return
  }

  // Validate CLI arguments if provided
  if (args.app || args.topics) {
    validateCliArgs(args)
    await initWithCliArgs(args)
  } else {
    // Fall back to interactive mode
    await initInteractive()
  }
}

async function main () {
  try {
    await init()
  } catch (error: any) {
    debug('Full error details:', error)
    console.error('\nerror: %s', error.message || error)
    console.error('\n\n😵 Shiver me timbers!\n')

    // eslint-disable-next-line n/no-process-exit
    process.exit(1)
  }
}

main()
