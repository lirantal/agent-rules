#!/usr/bin/env node

import { intro, outro, select } from '@clack/prompts'
import { styleText } from 'node:util'
import { debuglog } from 'node:util'

const debug = debuglog('agent-rules')

async function init () {
  intro(styleText(['bgMagentaBright', 'black'], ' Agent, rules!'))

  const aiApp = await select({
    message: 'Which AI App would you like to generate agentic rules for?',
    options: [
      { value: 'claude-code', label: 'Claude Code' },
      { value: 'github-copilot', label: 'GitHub Copilot' },
      { value: 'cursor', label: 'Cursor' },
    ],
    initialValue: 'github-copilot',
  })

  debug('Selected AI App:', aiApp)

  outro('good luck with your vibe coding, captain 🫡')
}

init()
