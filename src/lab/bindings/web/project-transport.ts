import { createRpcClientHub } from 'wenay-common2'
import { io } from 'socket.io-client'
import type { tArenaFacade } from '../../../campaigns/realtime-simulation/facade/arena-facade'
import type { tLabFacade } from '../../facade/lab-facade'

export function createProjectTransport(deps: {
    createSocket?: (token: string | null) => ReturnType<typeof io>
}) {
    const createSocket = deps.createSocket ?? function defaultSocket() {
        return io({path: '/socket.io', transports: ['websocket']})
    }
    const hub = createRpcClientHub(
        createSocket,
        function createSchema(rpc) {
            return {
                lab: rpc<tLabFacade>('lab'),
                arena: rpc<tArenaFacade>('arena'),
            }
        },
    )
    let connectPromise: Promise<Awaited<ReturnType<typeof hub.connect>>> | null = null
    let ready = false
    let retainCount = 0

    async function connect() {
        if (ready) return hub.facade
        if (!connectPromise) {
            connectPromise = hub.connect(null).then(async function readyAllChannels(clients) {
                await Promise.all([clients.lab.readyStrict(), clients.arena.readyStrict()])
                ready = true
                return clients
            }).finally(function clearPendingConnect() { connectPromise = null })
        }
        return connectPromise
    }

    function retain() {
        retainCount += 1
    }

    function release() {
        retainCount = Math.max(0, retainCount - 1)
        if (retainCount != 0) return
        hub.socket?.disconnect?.()
        ready = false
    }

    hub.connectListen(function transportConnected() {
        ready = true
    })
    hub.disconnectListen(function transportDisconnected() {
        ready = false
    })

    return {
        api: {
            connect,
            facade: hub.facade,
            connectListen: hub.connectListen,
            disconnectListen: hub.disconnectListen,
            diagnostics: function diagnostics() {
                return {retainedConsumers: retainCount, pending: hub.facade.lab.api.pending()}
            },
        },
        control: {retain, release},
        testing: {socket: () => hub.socket},
    }
}

export type tProjectTransport = ReturnType<typeof createProjectTransport>
