import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { createLabService } from './create-lab-service'

const currentDirectory = dirname(fileURLToPath(import.meta.url))
const rootDirectory = resolve(currentDirectory, '../../../../')
const port = Number(process.env.PORT ?? 4311)
const service = createLabService({rootDirectory, port})

async function main() {
    await service.api.start()
    console.log(`AI Live laboratory service: ${service.api.address()}`)
}

async function shutdown(signal: string) {
    console.log(`Stopping AI Live laboratory (${signal})`)
    await service.api.stop()
    process.exit(0)
}

process.once('SIGINT', function onSigint() { void shutdown('SIGINT') })
process.once('SIGTERM', function onSigterm() { void shutdown('SIGTERM') })

main().catch(function reportStartupError(error) {
    console.error(error)
    process.exit(1)
})
