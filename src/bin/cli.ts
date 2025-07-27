#!/usr/bin/env node

import { intro, outro, select, multiselect } from '@clack/prompts'
import { styleText, debuglog } from 'node:util'
import { scaffoldAiAppInstructions } from '../main.js'

const debug = debuglog('agent-rules')

async function init () {
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

  for (const codeTopic of topicChoices) {
    const templateChoices = {
      aiApp,
      codeLanguage,
      codeTopic
    }

    await scaffoldAiAppInstructions(templateChoices)
  }

  outro('Aye Captain, godspeed with yar vibe coding 🫡')
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
