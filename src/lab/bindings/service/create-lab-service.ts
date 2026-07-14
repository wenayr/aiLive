import { existsSync } from 'node:fs'
import { createServer } from 'node:http'
import { resolve } from 'node:path'
import express from 'express'
import { Server as SocketServer } from 'socket.io'
import { createRpcServerAuto, listen } from 'wenay-common2'
import { createLocalExecutor } from '../executor-local/local-executor'
import { createFileRunStore } from '../store-file/file-run-store'
import { createTaskRegistry } from '../../coordination/task-registry'
import { createLabCoordinator } from '../../coordination/lab-coordinator'
import { createLabFacade } from '../../facade/lab-facade'
import { createRunStore } from '../../resource/run-store'
import { createArenaCoordinator } from '../../../campaigns/realtime-simulation/coordination/arena-coordinator'
import type { tArenaBot } from '../../../campaigns/realtime-simulation/coordination/arena-bot'
import { createArenaFacade } from '../../../campaigns/realtime-simulation/facade/arena-facade'
import type { tArenaCommandOutcome } from '../../../campaigns/realtime-simulation/contracts/arena-contracts'
import { createArenaScenario } from '../../../campaigns/realtime-simulation/transform/scenario'

const localRpcLimits = {
    maxDepth: 12,
    maxKeys: 200,
    maxArgs: 8,
    maxArrayLen: 512,
    maxStringLen: 16_384,
    maxCallbacks: 24,
    maxPathLen: 10,
    maxBinaryLen: 1_000_000,
}

export function createLabService(deps: {
    rootDirectory: string
    host?: string
    port?: number
    testing?: {
        afterArenaIntentOutcome?: (outcome: tArenaCommandOutcome) => boolean
        arenaBots?: tArenaBot[]
    }
}) {
    const rootDirectory = resolve(deps.rootDirectory)
    const host = deps.host ?? '127.0.0.1'
    const port = deps.port ?? 4311
    const registry = createTaskRegistry({tasksRoot: resolve(rootDirectory, 'tasks')})
    registry.control.reload()
    const runStore = createRunStore({})
    const fileStore = createFileRunStore({rootDirectory: resolve(rootDirectory, '.laboratory')})
    const executor = createLocalExecutor({runStore, fileStore})
    const coordinator = createLabCoordinator({registry, runStore, executor, fileStore})
    const facade = createLabFacade({coordinator})
    const arenaCoordinator = createArenaCoordinator({
        scenario: createArenaScenario({
            id: 'local-observable-arena',
            seed: 'local-observable-arena-v1',
            width: 11,
            height: 7,
            obstacleRate: 0.12,
        }),
        bots: deps.testing?.arenaBots,
    })
    const arenaFacade = createArenaFacade({coordinator: arenaCoordinator})
    const app = express()
    const httpServer = createServer(app)
    const io = new SocketServer(httpServer)
    const webDirectory = resolve(rootDirectory, 'dist', 'web')
    let started = false

    app.get('/api/health', function getHealth(_request, response) {
        response.json(coordinator.runtime.health())
    })
    app.get('/api/snapshot', function getSnapshot(_request, response) {
        response.json(coordinator.runtime.snapshot())
    })
    app.get('/api/arena/snapshot', function getArenaSnapshot(_request, response) {
        response.json(arenaCoordinator.runtime.snapshot())
    })
    app.get('/api/arena/metrics', function getArenaMetrics(_request, response) {
        response.json(arenaCoordinator.debug.metrics())
    })

    io.on('connection', function onConnection(socket) {
        const [emitDisconnect, disconnectListen] = listen<[]>()
        let dropArenaResponse = false

        function submitArenaIntent(input: unknown) {
            const outcome = arenaFacade.runtime.submitIntent(input)
            if (deps.testing?.afterArenaIntentOutcome?.(outcome)) dropArenaResponse = true
            return outcome
        }

        function emitArenaPacket(key: string, data: unknown) {
            if (dropArenaResponse && Array.isArray(data) && data[0] == 1) {
                dropArenaResponse = false
                socket.disconnect(true)
                return
            }
            socket.emit(key, data)
        }

        const arenaRpcFacade = {
            ...arenaFacade,
            runtime: {...arenaFacade.runtime, submitIntent: submitArenaIntent},
        }

        socket.on('disconnect', function onDisconnect() {
            emitDisconnect()
        })
        createRpcServerAuto({
            socket: {
                emit: function emit(key: string, data: unknown) { socket.emit(key, data) },
                on: function on(key: string, callback: (...args: any[]) => void) { socket.on(key, callback) },
            },
            socketKey: 'lab',
            object: facade,
            disconnectListen,
            limits: localRpcLimits,
            maxPerListen: 8,
            replay: 'auto',
            hooks: {
                onRequest: function allowLabRequest() { return true },
                onInvalid: function reportInvalidLabRequest({reason}) { console.warn(`[lab-rpc] rejected packet: ${reason}`) },
            },
        })
        createRpcServerAuto({
            socket: {
                emit: emitArenaPacket,
                on: function on(key: string, callback: (...args: any[]) => void) { socket.on(key, callback) },
            },
            socketKey: 'arena',
            object: arenaRpcFacade,
            disconnectListen,
            limits: localRpcLimits,
            maxPerListen: 8,
            replay: 'auto',
            hooks: {
                onRequest: function allowArenaRequest() { return true },
                onInvalid: function reportInvalidArenaRequest({reason}) { console.warn(`[arena-rpc] rejected packet: ${reason}`) },
            },
        })
    })

    if (existsSync(webDirectory)) {
        app.use(express.static(webDirectory))
        app.use(function serveSinglePageApp(request, response, next) {
            if (request.method != 'GET' || request.path.startsWith('/api') || !request.accepts('html')) {
                next()
                return
            }
            response.sendFile(resolve(webDirectory, 'index.html'))
        })
    }

    function start() {
        if (started) return Promise.resolve()
        return new Promise<void>(function listenService(resolveStart, rejectStart) {
            function onError(error: Error) {
                httpServer.off('listening', onListening)
                rejectStart(error)
            }
            function onListening() {
                httpServer.off('error', onError)
                started = true
                arenaCoordinator.control.start()
                resolveStart()
            }
            httpServer.once('error', onError)
            httpServer.once('listening', onListening)
            httpServer.listen(port, host)
        })
    }

    function stop() {
        coordinator.control.dispose()
        arenaCoordinator.control.stop()
        if (!started) return Promise.resolve()
        return new Promise<void>(function closeService(resolveStop, rejectStop) {
            io.close(function onSocketClose(error) {
                if (error) {
                    rejectStop(error)
                    return
                }
                // Socket.IO owns this HTTP server and closes it as part of
                // io.close(). Calling httpServer.close() again throws
                // ERR_SERVER_NOT_RUNNING on Node 24.
                started = false
                resolveStop()
            })
        })
    }

    return {
        api: {
            start,
            stop,
            address: function address() {
                const bound = httpServer.address()
                const actualPort = typeof bound == 'object' && bound ? bound.port : port
                return `http://${host}:${actualPort}`
            },
            coordinator,
            arenaCoordinator,
        },
    }
}

export type tLabService = ReturnType<typeof createLabService>
