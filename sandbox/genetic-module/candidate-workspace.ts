import { createHash } from 'node:crypto'
import {
    access,
    lstat,
    mkdir,
    readFile,
    readdir,
    unlink,
    writeFile,
} from 'node:fs/promises'
import { dirname, isAbsolute, relative, resolve } from 'node:path'
import type { tSandboxFileContext, tSandboxFileReplacement } from './model-contract'

export function createCandidateWorkspace(deps: {
    workspaceDirectory: string
    seedDirectory: string
    allowedPaths: string[]
    maxFiles: number
    maxBytes: number
}) {
    const workspaceDirectory = resolve(deps.workspaceDirectory)
    const seedDirectory = resolve(deps.seedDirectory)
    const allowedPaths = new Set(deps.allowedPaths.map(normalizeRelativePath))
    let prepared = false

    async function prepare() {
        if (await exists(workspaceDirectory)) throw new Error(`Candidate workspace already exists: ${workspaceDirectory}`)
        await mkdir(workspaceDirectory, {recursive: true})
        await copyDirectory(seedDirectory, workspaceDirectory)
        prepared = true
        return workspaceDirectory
    }

    async function read(paths: string[]) {
        requirePrepared()
        return Promise.all(paths.map(readState))
    }

    async function apply(files: tSandboxFileReplacement[]) {
        requirePrepared()
        if (files.length == 0 || files.length > deps.maxFiles) {
            throw new Error(`Model response must replace between 1 and ${deps.maxFiles} files`)
        }
        const uniquePaths = new Set<string>()
        const validated = [] as Array<{
            replacement: tSandboxFileReplacement
            before: tSandboxFileContext
        }>
        let totalBytes = 0

        for (const replacement of files) {
            const path = normalizeRelativePath(replacement.path)
            if (!allowedPaths.has(path)) throw new Error(`Model write is outside the allowlist: ${path}`)
            if (uniquePaths.has(path)) throw new Error(`Duplicate model write: ${path}`)
            uniquePaths.add(path)
            if (replacement.content != null && typeof replacement.content != 'string') {
                throw new Error(`Model content must be a string or null: ${path}`)
            }
            totalBytes += replacement.content == null ? 0 : Buffer.byteLength(replacement.content)
            if (totalBytes > deps.maxBytes) throw new Error(`Model response exceeds ${deps.maxBytes} bytes`)
            const before = await readState(path)
            if (before.revision != replacement.baseRevision) {
                throw new Error(`Stale base revision for ${path}: expected ${String(before.revision)}`)
            }
            if (before.content == replacement.content) throw new Error(`Model response does not change ${path}`)
            validated.push({replacement: {...replacement, path}, before})
        }

        const changes = []
        for (const item of validated) {
            const path = item.replacement.path
            const target = resolveWithin(workspaceDirectory, path)
            await rejectSymlink(target)
            if (item.replacement.content == null) {
                await unlink(target)
            } else {
                await mkdir(dirname(target), {recursive: true})
                await writeFile(target, item.replacement.content, 'utf8')
            }
            const after = await readState(path)
            changes.push({path, before: item.before, after})
        }
        return changes
    }

    async function readState(pathInput: string): Promise<tSandboxFileContext> {
        const path = normalizeRelativePath(pathInput)
        const target = resolveWithin(workspaceDirectory, path)
        try {
            const info = await lstat(target)
            if (info.isSymbolicLink()) throw new Error(`Candidate path is a symbolic link: ${path}`)
            if (!info.isFile()) throw new Error(`Candidate path is not a file: ${path}`)
            const content = await readFile(target, 'utf8')
            return {path, revision: revision(content), content}
        } catch (error) {
            if (isMissing(error)) return {path, revision: null, content: null}
            throw error
        }
    }

    function requirePrepared() {
        if (!prepared) throw new Error('Prepare the candidate workspace before using it')
    }

    return {
        api: {read, directory: () => workspaceDirectory},
        control: {prepare, apply},
    }
}

async function copyDirectory(source: string, target: string) {
    for (const entry of await readdir(source, {withFileTypes: true})) {
        const sourcePath = resolveWithin(source, entry.name)
        const targetPath = resolveWithin(target, entry.name)
        const info = await lstat(sourcePath)
        if (info.isSymbolicLink()) throw new Error(`Seed contains a symbolic link: ${sourcePath}`)
        if (info.isDirectory()) {
            await mkdir(targetPath, {recursive: true})
            await copyDirectory(sourcePath, targetPath)
            continue
        }
        if (!info.isFile()) throw new Error(`Seed contains an unsupported entry: ${sourcePath}`)
        await mkdir(dirname(targetPath), {recursive: true})
        await writeFile(targetPath, await readFile(sourcePath))
    }
}

async function rejectSymlink(path: string) {
    try {
        if ((await lstat(path)).isSymbolicLink()) throw new Error(`Candidate target is a symbolic link: ${path}`)
    } catch (error) {
        if (!isMissing(error)) throw error
    }
}

function normalizeRelativePath(path: string) {
    const normalized = path.trim().replaceAll('\\', '/')
    if (!normalized || normalized.startsWith('/') || normalized.split('/').includes('..')) {
        throw new Error(`Path must stay below the candidate workspace: ${path}`)
    }
    return normalized
}

function resolveWithin(root: string, path: string) {
    const candidate = resolve(root, path)
    const local = relative(root, candidate)
    if (local == '' || local.startsWith('..') || isAbsolute(local)) {
        throw new Error(`Path escapes root: ${path}`)
    }
    return candidate
}

function revision(content: string) {
    return `sha256:${createHash('sha256').update(content).digest('hex')}`
}

async function exists(path: string) {
    try {
        await access(path)
        return true
    } catch {
        return false
    }
}

function isMissing(error: unknown) {
    return typeof error == 'object'
        && error != null
        && 'code' in error
        && error.code == 'ENOENT'
}

export type tCandidateWorkspace = ReturnType<typeof createCandidateWorkspace>
