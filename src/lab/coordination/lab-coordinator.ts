import { Replay } from 'wenay-common2'
import type { tLabHealth, tLabLiveUpdate } from '../contracts/lab-contracts'
import type { tLocalExecutor } from '../bindings/executor-local/local-executor'
import type { tFileRunStore } from '../bindings/store-file/file-run-store'
import type { tRunStore } from '../resource/run-store'
import { isoNow } from '../utility/time'
import type { tTaskRegistry } from './task-registry'

export function createLabCoordinator(deps: {
    registry: tTaskRegistry
    runStore: tRunStore
    executor: tLocalExecutor
    fileStore: tFileRunStore
}) {
    const [emitUpdate, updates] = Replay.replayListen<[tLabLiveUpdate]>({history: 2_000, current: 'last'})
    const offRunEvent = deps.runStore.api.events.on(function onRunEvent(event) {
        const run = deps.runStore.api.get(event.runId)
        if (!run) return
        deps.fileStore.control.appendTrace(event)
        deps.fileStore.control.writeRecord(run)
        emitUpdate({event, run})
    })

    function health(): tLabHealth {
        return {
            service: 'live',
            executor: 'local-guarded',
            sandbox: 'none',
            activeRuns: deps.executor.api.activeCount(),
        }
    }

    function snapshot() {
        return {
            generatedAt: isoNow(),
            health: health(),
            tasks: deps.registry.api.list(),
            runs: deps.runStore.api.list(),
        }
    }

    function startTask(taskId: string) {
        const task = deps.registry.api.get(taskId)
        if (!task) throw new Error(`Unknown task: ${taskId}`)
        return deps.executor.control.start(task)
    }

    function cancelRun(runId: string) {
        if (!deps.executor.control.cancel(runId)) throw new Error(`Run is not active: ${runId}`)
        return deps.runStore.api.get(runId)
    }

    function trace(runId: string) {
        return deps.runStore.api.trace(runId)
    }

    function dispose() {
        offRunEvent()
        deps.executor.control.stopAll()
    }

    return {
        runtime: {health, snapshot, startTask, cancelRun},
        debug: {updates, trace},
        testing: {
            activeRuns: deps.executor.api.activeCount,
        },
        control: {dispose},
    }
}

export type tLabCoordinator = ReturnType<typeof createLabCoordinator>
