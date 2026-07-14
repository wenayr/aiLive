import { createHash } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const seed = process.env.LAB_SEED ?? 'l0'
const artifactDirectory = process.env.LAB_ARTIFACT_DIR
if (!artifactDirectory) throw new Error('LAB_ARTIFACT_DIR is required')

const hash = createHash('sha256').update(seed).digest('hex')
console.log(`seed=${seed}`)
console.log(`sha256=${hash}`)
await mkdir(artifactDirectory, {recursive: true})
await writeFile(join(artifactDirectory, 'result.json'), JSON.stringify({seed, hash}, null, 2) + '\n')
console.log('artifact=result.json')
