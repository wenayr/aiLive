import { type DeepSocketListen } from 'wenay-common2'
import { createUpdateApi } from 'wenay-react2'
import type { tLabLiveUpdate, tLabSnapshot } from '../../contracts/lab-contracts'
import type { tLabFacade } from '../../facade/lab-facade'
import type { tProjectTransport } from './project-transport'

export type tLabConnection = 'idle' | 'connecting' | 'live' | 'disconnected' | 'error'

export type tLabClientState = {
    connection: tLabConnection
    snapshot: tLabSnapshot | null
    error: string | null
}

function applyUpdate(snapshot: tLabSnapshot, update: tLabLiveUpdate) {
    const oldRun = snapshot.runs.find(function findRun(run) { return run.id == update.run.id })
    const runs = oldRun
        ? snapshot.runs.map(function replaceRun(run) { return run.id == update.run.id ? update.run : run })
        : [update.run, ...snapshot.runs]
    const activeRuns = runs.filter(function isActive(run) {
        return run.status == 'queued' || run.status == 'starting' || run.status == 'running'
    }).length
    return {
        ...snapshot,
        generatedAt: update.event.at,
        health: {...snapshot.health, activeRuns},
        runs,
    }
}

export function createLabClient(deps: {transport: tProjectTransport}) {
    const state: tLabClientState = {
        connection: 'idle',
        snapshot: null,
        error: null,
    }
    const updates = createUpdateApi(state)
    let offUpdates: (() => void) | null = null
    let retained = false

    function render() {
        updates.emit()
    }

    async function refresh() {
        const snapshot = await deps.transport.api.facade.lab.func.runtime.snapshot()
        state.snapshot = snapshot
        state.error = null
        render()
        return snapshot
    }

    function subscribe() {
        offUpdates?.()
        const listens = deps.transport.api.facade.lab.func as unknown as DeepSocketListen<tLabFacade>
        offUpdates = listens.debug.updates.on(function onLiveUpdate(update) {
            if (state.snapshot) state.snapshot = applyUpdate(state.snapshot, update)
            render()
        })
    }

    async function connect() {
        state.connection = 'connecting'
        state.error = null
        render()
        try {
            if (!retained) {
                deps.transport.control.retain()
                retained = true
            }
            const clients = await deps.transport.api.connect()
            await clients.lab.readyStrict()
            await refresh()
            subscribe()
            state.connection = 'live'
            render()
        } catch (error) {
            state.connection = 'error'
            state.error = error instanceof Error ? error.message : String(error)
            render()
        }
    }

    async function startTask(taskId: string) {
        await deps.transport.api.facade.lab.func.runtime.startTask(taskId)
    }

    async function cancelRun(runId: string) {
        await deps.transport.api.facade.lab.func.runtime.cancelRun(runId)
    }

    function disconnect() {
        offUpdates?.()
        offUpdates = null
        if (retained) {
            deps.transport.control.release()
            retained = false
        }
        state.connection = 'idle'
        render()
    }

    deps.transport.api.connectListen(function onHubConnect() {
        if (state.connection == 'live') return
        state.connection = 'live'
        void refresh()
        render()
    })
    deps.transport.api.disconnectListen(function onHubDisconnect(reason) {
        state.connection = 'disconnected'
        state.error = reason
        render()
    })

    return {
        state,
        api: {connect, refresh, startTask, cancelRun},
        control: {disconnect},
    }
}
