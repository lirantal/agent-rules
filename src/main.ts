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

export async function resolveTemplateDirectory (scaffoldInstructions: ScaffoldInstructions): Promise<string> {
  const { codeLanguage, codeTopic } = scaffoldInstructions

  const currentFileDirectory = getCurrentFileDirectory()
  const templateDirectory = path.join(currentFileDirectory, templateRoot, codeLanguage, codeTopic)
  const resolvedTemplateDirectory = path.resolve(templateDirectory)

  try {
    const templateStats = await fs.stat(resolvedTemplateDirectory)
    if (!templateStats.isDirectory()) {
      throw new Error(`Template directory is not a directory: ${resolvedTemplateDirectory}`)
    }
  } catch (error) {
    throw new Error(`Template directory not found: ${resolvedTemplateDirectory}`)
  }

  return resolvedTemplateDirectory
}

async function createTargetDirectory (directory: string): Promise<string> {
  const resolvedTargetDirectory = path.resolve(directory)
  await fs.mkdir(resolvedTargetDirectory, { recursive: true })
  return resolvedTargetDirectory
}

function generateTargetFileName (templateFileName: string, filesSuffix: string): string {
  const parsedFile = path.parse(templateFileName)
  let baseName = parsedFile.name

  // If the template file already has the suffix in its name, remove it to avoid duplication
  if (baseName.endsWith('.instructions')) {
    baseName = baseName.replace(/\.instructions$/, '')
  }

  return `${baseName}${filesSuffix}`
}

function validateTargetPath (targetFilePath: string, resolvedTargetDirectory: string): string {
  const resolvedTargetFilePath = path.resolve(targetFilePath)
  if (!resolvedTargetFilePath.startsWith(resolvedTargetDirectory)) {
    throw new Error(`Invalid target path: ${targetFilePath}`)
  }
  return resolvedTargetFilePath
}

async function copyTemplateFile (
  templateFilePath: string,
  targetFilePath: string,
  resolvedTargetDirectory: string,
  filesSuffix: string
): Promise<void> {
  const sanitizedTemplateFile = path.basename(templateFilePath)
  const fullTemplatePath = path.join(path.dirname(templateFilePath), sanitizedTemplateFile)

  debug('Processing template file:', sanitizedTemplateFile)

  try {
    const stat = await fs.stat(fullTemplatePath)

    // Only process files, not directories
    if (stat.isFile()) {
      const targetFileName = generateTargetFileName(sanitizedTemplateFile, filesSuffix)
      const targetPath = path.join(targetFilePath, targetFileName)
      const resolvedTargetFilePath = validateTargetPath(targetPath, resolvedTargetDirectory)

      debug('Writing template file to target path:', resolvedTargetFilePath)

      // Read the template file content
      const templateContent = await fs.readFile(fullTemplatePath, 'utf-8')

      // Write to the target location
      await fs.writeFile(resolvedTargetFilePath, templateContent, 'utf-8')
    }
  } catch (error) {
    console.warn(`Skipping file ${sanitizedTemplateFile}: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

async function copyTemplateFiles (
  resolvedTemplateDirectory: string,
  resolvedTargetDirectory: string,
  filesSuffix: string
): Promise<void> {
  const templateFiles = await fs.readdir(resolvedTemplateDirectory)

  for (const templateFile of templateFiles) {
    const templateFilePath = path.join(resolvedTemplateDirectory, templateFile)
    await copyTemplateFile(templateFilePath, resolvedTargetDirectory, resolvedTargetDirectory, filesSuffix)
  }
}

export async function scaffoldAiAppInstructions (scaffoldInstructions: ScaffoldInstructions): Promise<void> {
  const { aiApp, codeLanguage, codeTopic } = scaffoldInstructions
  if (!aiApp || !codeLanguage || !codeTopic) {
    throw new Error('Scaffold instructions must include aiApp and all other template choices.')
  }

  const aiAppConfig = getAiAppDirectory(aiApp)
  const { directory, filesSuffix } = aiAppConfig

  debug(`Scaffolding AI App instructions in directory: ${directory} with files suffix: ${filesSuffix}`)

  // Resolve and validate template directory, then ensure target directory exists
  const resolvedTemplateDirectory = await resolveTemplateDirectory(scaffoldInstructions)
  const resolvedTargetDirectory = await createTargetDirectory(directory)

  // Copy all template files to the target directory
  await copyTemplateFiles(resolvedTemplateDirectory, resolvedTargetDirectory, filesSuffix)
}
