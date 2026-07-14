import { Replay } from 'wenay-common2'
import { arenaProtocolVersion } from '../contracts/arena-contracts'
import type {
    tArenaCommand,
    tArenaCommandIntent,
    tArenaCommandOutcome,
    tArenaLiveUpdate,
    tArenaMetrics,
    tArenaScenario,
} from '../contracts/arena-contracts'
import { copyArenaJson } from '../utility/arena-json'
import { createArenaBot, type tArenaBot } from './arena-bot'
import { parseArenaCommandIntent, validateArenaProtocolVersion } from '../transform/protocol'
import { createArenaSimulation } from '../transform/simulation'

export function createArenaCoordinator(deps: {
    scenario: tArenaScenario
    tickMs?: number
    bots?: tArenaBot[]
}) {
    const tickMs = deps.tickMs ?? 250
    const bots = deps.bots ?? deps.scenario.spawns.map(function createBot(spawn) {
        return createArenaBot({actorId: spawn.id})
    })
    const simulation = createArenaSimulation({scenario: deps.scenario})
    const [emitUpdate, updates] = Replay.replayListen<[tArenaLiveUpdate]>({history: 2_000, current: 'last'})
    const pendingCommands: tArenaCommand[] = []
    const commandOutcomes = new Map<string, tArenaCommandOutcome>()
    let timer: ReturnType<typeof setInterval> | null = null
    let ticksExecuted = 0
    let nextCommandSequence = 0

    function snapshot() {
        return simulation.runtime.snapshot()
    }

    function queueCommand(command: tArenaCommand) {
        pendingCommands.push(copyArenaJson(command))
    }

    function submitIntent(input: unknown): tArenaCommandOutcome {
        const parsed = parseArenaCommandIntent(input)
        if (!parsed.ok) return {accepted: false, clientCommandId: parsed.clientCommandId, code: 'ARENA_COMMAND_INVALID'}
        const previous = commandOutcomes.get(parsed.value.clientCommandId)
        if (previous) return copyArenaJson(previous)
        const protocol = validateArenaProtocolVersion(parsed.value.protocolVersion)
        if (!protocol.ok) {
            const outcome: Extract<tArenaCommandOutcome, {accepted: false}> = {
                accepted: false,
                clientCommandId: parsed.value.clientCommandId,
                code: protocol.error.code,
            }
            commandOutcomes.set(parsed.value.clientCommandId, outcome)
            return copyArenaJson(outcome)
        }
        const outcome = scheduleIntent(parsed.value)
        commandOutcomes.set(outcome.clientCommandId, outcome)
        return copyArenaJson(outcome)
    }

    function scheduleIntent(intent: tArenaCommandIntent): Extract<tArenaCommandOutcome, {accepted: true}> {
        const command = {
            protocolVersion: arenaProtocolVersion,
            tick: snapshot().tick + 1,
            sequence: nextCommandSequence + 1,
            actorId: intent.actorId,
            kind: intent.kind,
            ...('direction' in intent ? {direction: intent.direction} : {}),
        } as tArenaCommand
        nextCommandSequence = command.sequence
        queueCommand(command)
        return {
            accepted: true,
            clientCommandId: intent.clientCommandId,
            scheduledTick: command.tick,
            sequence: command.sequence,
        }
    }

    function advance() {
        const before = snapshot()
        const queued = pendingCommands.filter(function due(command) { return command.tick <= before.tick })
        pendingCommands.splice(0, pendingCommands.length, ...pendingCommands.filter(function future(command) {
            return command.tick > before.tick
        }))
        const botCommands = bots
            .map(function commandFromBot(bot) { return bot.api.commandFor(before) })
            .filter(function defined(command): command is tArenaCommand { return command != null })
        const result = simulation.runtime.tick([...queued, ...botCommands])
        ticksExecuted += 1
        const update: tArenaLiveUpdate = {
            state: result.state,
            events: result.events,
            stateHash: simulation.runtime.stateHash(),
            source: 'tick',
        }
        emitUpdate(copyArenaJson(update))
        return update
    }

    function metrics(): tArenaMetrics {
        return {
            running: timer != null,
            tickMs,
            ticksExecuted,
            pendingCommands: pendingCommands.length,
            stateHash: simulation.runtime.stateHash(),
        }
    }

    function start() {
        if (timer) return
        timer = setInterval(advance, tickMs)
    }

    function stop() {
        if (!timer) return
        clearInterval(timer)
        timer = null
    }

    return {
        runtime: {snapshot, submitIntent},
        debug: {updates, metrics, events: simulation.debug.events},
        testing: {advance, queueCommand, queuedCommands: () => copyArenaJson(pendingCommands)},
        control: {start, stop},
    }
}

export type tArenaCoordinator = ReturnType<typeof createArenaCoordinator>
