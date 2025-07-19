#!/usr/bin/env node

import { intro, outro, select } from '@clack/prompts'
import { styleText } from 'node:util'
import { debuglog } from 'node:util'
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

  const codeTopic = await select({
    message: 'Which topic do you want to generate agentic rules for?',
    options: [
      { value: 'testing', label: 'Testing' },
    ],
    initialValue: 'testing',
  })

  // Handle cancellation
  if (typeof codeTopic === 'symbol') {
    throw new Error('Operation cancelled by user')
  }

  debug('Selected code topic:', codeTopic)

  const templateChoices = {
    aiApp,
    codeLanguage,
    codeTopic
  }

  await scaffoldAiAppInstructions(templateChoices)

  outro('Aye Captain, godspeed with yar vibe coding 🫡')
}

async function main () {
  try {
    await init()
  } catch (error) {
    debug('Full error details:', error)
    console.log('Shiver me timbers!')

    // eslint-disable-next-line n/no-process-exit
    process.exit(1)
  }
}

main()
