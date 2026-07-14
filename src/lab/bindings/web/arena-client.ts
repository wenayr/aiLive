import { Replay } from 'wenay-common2'
import { createUpdateApi } from 'wenay-react2'
import { arenaProtocolVersion, type tArenaLiveUpdate, type tArenaMetrics, type tArenaState } from '../../../campaigns/realtime-simulation/contracts/arena-contracts'
import type { tProjectTransport } from './project-transport'

export type tArenaClientState = {
    connection: 'idle' | 'connecting' | 'live' | 'disconnected' | 'error'
    snapshot: tArenaState | null
    metrics: tArenaMetrics | null
    lastUpdate: tArenaLiveUpdate | null
    replaySequence: number
    recovery: 'idle' | 'recovering' | 'live' | 'stale' | 'error'
    desyncCount: number
    error: string | null
}

export function createArenaClient(deps: {transport: tProjectTransport}) {
    const state: tArenaClientState = {
        connection: 'idle', snapshot: null, metrics: null, lastUpdate: null,
        replaySequence: -1, recovery: 'idle', desyncCount: 0, error: null,
    }
    const updates = createUpdateApi(state)
    let offUpdates: ReturnType<typeof Replay.replaySubscribe<[tArenaLiveUpdate]>> | null = null
    let retained = false
    let nextCommandId = 0

    function render() { updates.emit() }

    async function refresh() {
        const [snapshot, metrics] = await Promise.all([
            deps.transport.api.facade.arena.func.runtime.snapshot(),
            deps.transport.api.facade.arena.func.debug.metrics(),
        ])
        state.snapshot = snapshot
        state.metrics = metrics
        state.error = null
        render()
    }

    function subscribe() {
        offUpdates?.()
        state.recovery = 'recovering'
        const remote = deps.transport.api.facade.arena.func.debug.updates as unknown as Replay.ReplayRemote<[tArenaLiveUpdate]>
        const subscription = Replay.replaySubscribe(remote, function onUpdate(update) {
            state.snapshot = update.state
            state.lastUpdate = update
            if (state.metrics) state.metrics = {...state.metrics, stateHash: update.stateHash, ticksExecuted: state.metrics.ticksExecuted + 1}
            state.recovery = 'live'
            render()
        }, {
            since: state.replaySequence,
            onSeq: function receivedSequence(sequence) {
                state.replaySequence = sequence
            },
            staleMs: 2_500,
            onStale: function updateStaleness(info) {
                state.recovery = info.stale ? 'stale' : 'live'
                render()
            },
            onError: function replayFailure(error) {
                state.recovery = 'error'
                state.desyncCount += 1
                state.error = error instanceof Error ? error.message : String(error)
                render()
            },
        })
        offUpdates = subscription
        void subscription.ready.then(function replayReady() {
            if (state.recovery == 'recovering') state.recovery = 'live'
            render()
        })
    }

    async function connect() {
        state.connection = 'connecting'
        render()
        try {
            if (!retained) {
                deps.transport.control.retain()
                retained = true
            }
            const clients = await deps.transport.api.connect()
            await clients.arena.readyStrict()
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

    async function fire(actorId: string) {
        const currentTick = state.snapshot?.tick
        if (currentTick == null) return
        nextCommandId += 1
        await deps.transport.api.facade.arena.func.runtime.submitIntent({
            protocolVersion: arenaProtocolVersion,
            clientCommandId: `web-${actorId}-${currentTick}-${nextCommandId}`,
            actorId,
            kind: 'fire',
        })
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
        if (offUpdates) state.recovery = 'recovering'
        render()
    })
    deps.transport.api.disconnectListen(function onHubDisconnect(reason) {
        state.connection = 'disconnected'
        if (offUpdates) state.recovery = 'recovering'
        state.error = reason
        render()
    })

    return {state, api: {connect, refresh, fire}, control: {disconnect}}
}
