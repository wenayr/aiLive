import assert from 'node:assert/strict'
import test from 'node:test'
import { Replay } from 'wenay-common2'
import { io } from 'socket.io-client'
import type { tArenaLiveUpdate } from '../../../campaigns/realtime-simulation/contracts/arena-contracts'
import { createLabService } from '../service/create-lab-service'
import { createProjectTransport } from './project-transport'

function waitFor(check: () => boolean, remaining = 40): Promise<boolean> {
    if (check()) return Promise.resolve(true)
    if (remaining == 0) return Promise.resolve(false)
    return new Promise(function wait(resolve) {
        setTimeout(function retry() { void waitFor(check, remaining - 1).then(resolve) }, 10)
    })
}

function once(socket: {on: (event: string, cb: () => void) => void}, event: string) {
    return new Promise<void>(function wait(resolve) {
        socket.on(event, function received() { resolve() })
    })
}

test('one project transport multiplexes Lab and Arena and receives an Arena replay keyframe', async () => {
    const service = createLabService({rootDirectory: process.cwd(), port: 0})
    await service.api.start()
    let physicalSocketCount = 0
    const transport = createProjectTransport({
        createSocket: function createSocket() {
            physicalSocketCount += 1
            return io(service.api.address(), {path: '/socket.io', transports: ['websocket'], forceNew: true})
        },
    })
    transport.control.retain()
    let released = false

    try {
        service.api.arenaCoordinator.testing.advance()
        const clients = await transport.api.connect()
        await Promise.all([clients.lab.readyStrict(), clients.arena.readyStrict()])
        const received: tArenaLiveUpdate[] = []
        let sequence = -1
        const remote = transport.api.facade.arena.func.debug.updates as unknown as Replay.ReplayRemote<[tArenaLiveUpdate]>
        const subscription = Replay.replaySubscribe(remote, function onArenaUpdate(update) {
            received.push(update)
        }, {onSeq: function updateSequence(value) { sequence = value }})
        await subscription.ready

        assert.equal(physicalSocketCount, 1)
        assert.equal(received.length > 0, true)
        assert.equal(sequence >= 0, true)

        const sequenceBeforeDisconnect = sequence
        const socket = transport.testing.socket()!
        const disconnected = once(socket, 'disconnect')
        socket.disconnect()
        await disconnected
        service.api.arenaCoordinator.testing.advance()
        const reconnected = once(socket, 'connect')
        socket.connect()
        await reconnected

        assert.equal(await waitFor(function replayRecoveredTail() { return sequence > sequenceBeforeDisconnect }), true)
        assert.equal(new Set(received.map(function stateHash(update) { return update.stateHash })).size, received.length)
        subscription()
        transport.control.release()
        released = true
        assert.equal(await waitFor(function sharedSocketTornDown() { return !socket.connected }), true)
    } finally {
        if (!released) transport.control.release()
        await service.api.stop()
    }
})

test('Arena replay reports stale when the authoritative tick stops', async () => {
    const service = createLabService({rootDirectory: process.cwd(), port: 0})
    await service.api.start()
    service.api.arenaCoordinator.control.stop()
    service.api.arenaCoordinator.testing.advance()
    const transport = createProjectTransport({
        createSocket: function createSocket() {
            return io(service.api.address(), {path: '/socket.io', transports: ['websocket'], forceNew: true})
        },
    })
    transport.control.retain()
    let released = false

    try {
        await transport.api.connect()
        const remote = transport.api.facade.arena.func.debug.updates as unknown as Replay.ReplayRemote<[tArenaLiveUpdate]>
        let stale = false
        const subscription = Replay.replaySubscribe<[tArenaLiveUpdate]>(remote, function consumeArenaUpdate() {}, {
            staleMs: 30,
            onStale: function recordStale(info) { stale = info.stale },
        })
        await subscription.ready

        assert.equal(await waitFor(function staleDetected() { return stale }), true)
        subscription()
        transport.control.release()
        released = true
    } finally {
        if (!released) transport.control.release()
        await service.api.stop()
    }
})

test('ordinary Arena RPC is not retried after its response is lost and manual retry is idempotent', async () => {
    let submitIntentCalls = 0
    let dropFirstResponse = true
    const service = createLabService({
        rootDirectory: process.cwd(),
        port: 0,
        testing: {
            arenaBots: [],
            afterArenaIntentOutcome: function dropFirstArenaResponse() {
                submitIntentCalls += 1
                if (!dropFirstResponse) return false
                dropFirstResponse = false
                return true
            },
        },
    })
    await service.api.start()
    service.api.arenaCoordinator.control.stop()
    const transport = createProjectTransport({
        createSocket: function createSocket() {
            return io(service.api.address(), {path: '/socket.io', transports: ['websocket'], forceNew: true})
        },
    })
    transport.control.retain()
    let released = false
    const intent = {
        protocolVersion: 'arena/v1',
        clientCommandId: 'p1-response-loss-fire',
        actorId: 'alpha-1',
        kind: 'fire' as const,
    }

    try {
        const clients = await transport.api.connect()
        const initialCall = clients.arena.func.runtime.submitIntent(intent)
        await assert.rejects(initialCall)

        const socket = transport.testing.socket()!
        assert.equal(socket.connected, false)
        const reconnected = once(socket, 'connect')
        socket.connect()
        await reconnected
        await clients.arena.readyStrict()
        await new Promise(function waitForNoAutomaticRetry(resolve) { setTimeout(resolve, 20) })

        assert.equal(submitIntentCalls, 1)
        assert.equal(service.api.arenaCoordinator.testing.queuedCommands().length, 1)

        const repeated = await clients.arena.func.runtime.submitIntent(intent)
        assert.deepEqual(repeated, {
            accepted: true,
            clientCommandId: 'p1-response-loss-fire',
            scheduledTick: 1,
            sequence: 1,
        })
        assert.equal(submitIntentCalls, 2)
        assert.equal(service.api.arenaCoordinator.testing.queuedCommands().length, 1)

        const beforeScheduledTick = service.api.arenaCoordinator.testing.advance()
        const appliedTick = service.api.arenaCoordinator.testing.advance()
        assert.equal(beforeScheduledTick.events.length, 0)
        assert.equal(appliedTick.events.filter(function fired(event) { return event.kind == 'projectile-fired' }).length, 1)
    } finally {
        if (!released) transport.control.release()
        await service.api.stop()
    }
})
