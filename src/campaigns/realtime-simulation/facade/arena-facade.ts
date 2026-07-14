import type { tArenaCoordinator } from '../coordination/arena-coordinator'

export function createArenaFacade(deps: {coordinator: tArenaCoordinator}) {
    return {
        runtime: {
            snapshot: deps.coordinator.runtime.snapshot,
            submitIntent: deps.coordinator.runtime.submitIntent,
        },
        debug: {
            updates: deps.coordinator.debug.updates,
            metrics: deps.coordinator.debug.metrics,
            events: deps.coordinator.debug.events,
        },
    }
}

export type tArenaFacade = ReturnType<typeof createArenaFacade>
