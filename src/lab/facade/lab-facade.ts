import type { tLabCoordinator } from '../coordination/lab-coordinator'

export function createLabFacade(deps: {coordinator: tLabCoordinator}) {
    return {
        runtime: {
            health: deps.coordinator.runtime.health,
            snapshot: deps.coordinator.runtime.snapshot,
            startTask: deps.coordinator.runtime.startTask,
            cancelRun: deps.coordinator.runtime.cancelRun,
        },
        debug: {
            updates: deps.coordinator.debug.updates,
            trace: deps.coordinator.debug.trace,
        },
    }
}

export type tLabFacade = ReturnType<typeof createLabFacade>
