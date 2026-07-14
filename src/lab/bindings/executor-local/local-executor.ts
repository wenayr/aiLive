import { spawn, type ChildProcess } from 'node:child_process'
import type { tRegisteredTask } from '../../contracts/lab-contracts'
import type { tFileRunStore } from '../store-file/file-run-store'
import type { tRunStore } from '../../resource/run-store'
import { createLineBuffer } from '../../utility/line-buffer'

type tActiveRun = {
    child: ChildProcess | null
    timer: NodeJS.Timeout | null
    canceled: boolean
    timedOut: boolean
    finished: boolean
}

function createEnvironment(runId: string, artifactDirectory: string) {
    return {
        PATH: process.env.PATH ?? '',
        SystemRoot: process.env.SystemRoot ?? '',
        ComSpec: process.env.ComSpec ?? '',
        TEMP: process.env.TEMP ?? '',
        TMP: process.env.TMP ?? '',
        HOME: process.env.HOME ?? '',
        USERPROFILE: process.env.USERPROFILE ?? '',
        LAB_RUN_ID: runId,
        LAB_ARTIFACT_DIR: artifactDirectory,
        LAB_SEED: 'l0',
    }
}

export function createLocalExecutor(deps: {
    runStore: tRunStore
    fileStore: tFileRunStore
}) {
    const activeRuns = new Map<string, tActiveRun>()

    function activeCount() {
        return activeRuns.size
    }

    function start(task: tRegisteredTask) {
        const run = deps.runStore.control.create(task.definition)
        const active: tActiveRun = {
            child: null,
            timer: null,
            canceled: false,
            timedOut: false,
            finished: false,
        }
        const stdout = createLineBuffer()
        const stderr = createLineBuffer()
        activeRuns.set(run.id, active)
        deps.fileStore.control.ensureRun(run.id)
        deps.runStore.control.transition(run.id, 'starting', 'run-starting')

        function appendLines(stream: 'stdout' | 'stderr', lines: string[]) {
            for (const text of lines) {
                if (!text) continue
                deps.runStore.control.appendLog(run.id, {stream, text})
            }
        }

        function finish(exitCode: number | null, signal: NodeJS.Signals | null, spawnError?: Error) {
            if (active.finished) return
            active.finished = true
            if (active.timer) clearTimeout(active.timer)
            activeRuns.delete(run.id)
            appendLines('stdout', stdout.flush())
            appendLines('stderr', stderr.flush())

            for (const artifact of deps.fileStore.api.listArtifacts(run.id)) {
                deps.runStore.control.appendArtifact(run.id, artifact)
            }

            if (active.timedOut) {
                deps.runStore.control.transition(run.id, 'timed_out', 'run-timed-out', {
                    exitCode,
                    signal,
                    reason: `Task exceeded ${task.definition.timeoutMs}ms timeout`,
                })
                return
            }
            if (active.canceled) {
                deps.runStore.control.transition(run.id, 'canceled', 'run-canceled', {
                    exitCode,
                    signal,
                    reason: 'Canceled by operator',
                })
                return
            }
            if (spawnError || exitCode != 0) {
                deps.runStore.control.transition(run.id, 'failed', 'run-failed', {
                    exitCode,
                    signal,
                    reason: spawnError?.message ?? `Process exited with code ${String(exitCode)}`,
                })
                return
            }
            deps.runStore.control.transition(run.id, 'passed', 'run-passed', {exitCode, signal})
        }

        try {
            const child = spawn(process.execPath, task.definition.command.args, {
                cwd: task.directory,
                env: createEnvironment(run.id, deps.fileStore.api.artifactDirectory(run.id)),
                shell: false,
                windowsHide: true,
                stdio: ['ignore', 'pipe', 'pipe'],
            })
            active.child = child
            deps.runStore.control.transition(run.id, 'running', 'run-running')

            child.stdout?.on('data', function onStdout(chunk: Buffer) {
                appendLines('stdout', stdout.push(chunk.toString()))
            })
            child.stderr?.on('data', function onStderr(chunk: Buffer) {
                appendLines('stderr', stderr.push(chunk.toString()))
            })
            child.once('error', function onProcessError(error) {
                deps.runStore.control.appendLog(run.id, {stream: 'system', text: error.message})
                finish(null, null, error)
            })
            child.once('close', function onProcessClose(exitCode, signal) {
                finish(exitCode, signal)
            })
            active.timer = setTimeout(function onRunTimeout() {
                if (active.finished) return
                active.timedOut = true
                deps.runStore.control.append(run.id, 'run-timeout-requested', {timeoutMs: task.definition.timeoutMs})
                active.child?.kill()
            }, task.definition.timeoutMs)
        } catch (error) {
            const message = error instanceof Error ? error : new Error(String(error))
            deps.runStore.control.appendLog(run.id, {stream: 'system', text: message.message})
            finish(null, null, message)
        }

        return deps.runStore.api.get(run.id)!
    }

    function cancel(runId: string) {
        const active = activeRuns.get(runId)
        if (!active || active.finished) return false
        active.canceled = true
        deps.runStore.control.append(runId, 'run-cancel-requested', {})
        active.child?.kill()
        return true
    }

    function stopAll() {
        for (const runId of activeRuns.keys()) cancel(runId)
    }

    return {
        api: {activeCount},
        control: {start, cancel, stopAll},
    }
}

export type tLocalExecutor = ReturnType<typeof createLocalExecutor>
