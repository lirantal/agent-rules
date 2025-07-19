import path from 'node:path'
import fs from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { debuglog } from 'node:util'

type ScaffoldInstructions = {
  aiApp: string;
  codeLanguage: string;
  codeTopic: string;
}

type AiAppConfig = {
  directory: string;
  filesSuffix: string;
}

type AiAppsMap = {
  [key: string]: AiAppConfig;
}

const debug = debuglog('agent-rules')
const templateRoot = '__template__'

const mapAiAppsToDirectories: AiAppsMap = {
  'github-copilot': {
    directory: '.github/instructions',
    filesSuffix: '.instructions.md',
  }
}

// Simple path resolution because templates are copied to dist during build
// see package.json scripts for the build process
function getCurrentFileDirectory (): string {
  let guessedDirName: string = ''
  try {
    if (typeof import.meta !== 'undefined' && import.meta.url) {
      // ESM environment - templates are in dist/__template__
      const __filename = fileURLToPath(import.meta.url)
      guessedDirName = path.dirname(__filename)
    } else {
      guessedDirName = __dirname
    }
  } catch (error) {
    // CJS fallback - assume we're in a distributed package
    // In CJS, we don't have import.meta, so use __dirname
    guessedDirName = __dirname
  }

  // If we're in dist/bin, go up one level to dist
  // If we're already in dist, stay there
  if (guessedDirName.endsWith('dist/bin') || guessedDirName.endsWith('dist\\bin')) {
    return path.resolve(guessedDirName, '..')
  } else {
    return guessedDirName
  }
}

export function getAiAppDirectory (aiApp: string): AiAppConfig {
  // eslint-disable-next-line security/detect-object-injection
  const app = Object.hasOwn(mapAiAppsToDirectories, aiApp) ? mapAiAppsToDirectories[aiApp] : null
  if (!app) {
    throw new Error(`AI App "${aiApp}" is not supported.`)
  }
  return app
}

export function resolveTemplateDirectory (scaffoldInstructions: ScaffoldInstructions): string {
  const { codeLanguage, codeTopic } = scaffoldInstructions

  const currentFileDirectory = getCurrentFileDirectory()
  const templateDirectory = path.join(currentFileDirectory, templateRoot, codeLanguage, codeTopic)

  return templateDirectory
}

export async function scaffoldAiAppInstructions (scaffoldInstructions: ScaffoldInstructions): Promise<void> {
  const { aiApp, codeLanguage, codeTopic } = scaffoldInstructions
  if (!aiApp || !codeLanguage || !codeTopic) {
    throw new Error('Scaffold instructions must include aiApp and all other template choices.')
  }

  const aiAppConfig = getAiAppDirectory(aiApp)
  const { directory, filesSuffix } = aiAppConfig
  const templateDirectory = resolveTemplateDirectory(scaffoldInstructions)

  debug(`Scaffolding AI App instructions in directory: ${directory} with files suffix: ${filesSuffix}`)

  // Validate and sanitize paths to avoid security issues
  const resolvedTemplateDirectory = path.resolve(templateDirectory)
  const resolvedTargetDirectory = path.resolve(directory)

  // Ensure template directory exists and is safe
  try {
    const templateStats = await fs.stat(resolvedTemplateDirectory)
    if (!templateStats.isDirectory()) {
      throw new Error(`Template directory is not a directory: ${resolvedTemplateDirectory}`)
    }
  } catch (error) {
    throw new Error(`Template directory not found: ${resolvedTemplateDirectory}`)
  }

  // 1. Create the directory if it doesn't exist (a nested directories level may need to be created)
  await fs.mkdir(resolvedTargetDirectory, { recursive: true })

  // 2. Make a list of all files that need to be created based on the template root directory
  const templateFiles = await fs.readdir(resolvedTemplateDirectory)

  // 3. Copy the template files into the target directory, applying the suffix to each file
  for (const templateFile of templateFiles) {
    // Sanitize filename to prevent path traversal
    const sanitizedTemplateFile = path.basename(templateFile)
    const templateFilePath = path.join(resolvedTemplateDirectory, sanitizedTemplateFile)

    debug('Processing template file:', sanitizedTemplateFile)

    try {
      const stat = await fs.stat(templateFilePath)

      // Only process files, not directories
      if (stat.isFile()) {
        const parsedFile = path.parse(sanitizedTemplateFile)
        let baseName = parsedFile.name

        // If the template file already has the suffix in its name, remove it to avoid duplication
        if (baseName.endsWith('.instructions')) {
          baseName = baseName.replace(/\.instructions$/, '')
        }

        const targetFileName = `${baseName}${filesSuffix}`
        const targetFilePath = path.join(resolvedTargetDirectory, targetFileName)

        // Ensure target file is within the target directory (prevent path traversal)
        const resolvedTargetFilePath = path.resolve(targetFilePath)
        if (!resolvedTargetFilePath.startsWith(resolvedTargetDirectory)) {
          throw new Error(`Invalid target path: ${targetFilePath}`)
        }

        debug('Writing template file to target path:', resolvedTargetFilePath)

        // Read the template file content
        const templateContent = await fs.readFile(templateFilePath, 'utf-8')

        // Write to the target location
        await fs.writeFile(resolvedTargetFilePath, templateContent, 'utf-8')
      }
    } catch (error) {
      console.warn(`Skipping file ${sanitizedTemplateFile}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
}
