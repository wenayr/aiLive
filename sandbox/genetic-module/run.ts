import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { createGeneticSandbox } from './controller'
import { createFixtureModel } from './fixture-model'

export async function runGeneticSandboxCli(args = process.argv.slice(2)) {
    const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
    const fixture = args.includes('--fixture-model')
    const runIdArgument = args.find(function runId(value) { return value.startsWith('--run-id=') })
    const runId = runIdArgument?.slice('--run-id='.length) ?? createRunId(fixture ? 'smoke' : 'prepare')
    const fixtureModel = fixture ? createFixtureModel() : null
    const sandbox = createGeneticSandbox({
        projectRoot,
        runId,
        callModel: fixtureModel?.call,
    })
    const result = fixture ? await sandbox.control.run() : await sandbox.control.prepare()
    console.log(JSON.stringify(result, null, 2))
    return result
}

function createRunId(mode: string) {
    return `genetic-${mode}-${new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14)}`
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : null
if (invokedPath == resolve(fileURLToPath(import.meta.url))) {
    runGeneticSandboxCli().catch(function report(error) {
        console.error(error instanceof Error ? error.message : String(error))
        process.exitCode = 1
    })
}
