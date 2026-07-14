import type { tArenaCommand, tArenaEvent, tArenaScenario, tArenaState } from '../contracts/arena-contracts'
import { createArenaBot } from './arena-bot'
import { createArenaSimulation } from '../transform/simulation'

export function runBotArena(deps: {scenario: tArenaScenario, ticks: number}) {
    const simulation = createArenaSimulation({scenario: deps.scenario})
    const bots = deps.scenario.spawns
        .map(function createBot(spawn) { return createArenaBot({actorId: spawn.id}) })
    const commands: tArenaCommand[] = []
    const events: tArenaEvent[] = []

    for (let index = 0; index < deps.ticks; index += 1) {
        const snapshot = simulation.runtime.snapshot()
        const tickCommands = bots
            .map(function commandFromBot(bot) { return bot.api.commandFor(snapshot) })
            .filter(function defined(command): command is tArenaCommand { return command != null })
        commands.push(...tickCommands)
        const result = simulation.runtime.tick(tickCommands)
        events.push(...result.events)
    }

    return {
        state: simulation.runtime.snapshot() as tArenaState,
        commands,
        events,
        stateHash: simulation.runtime.stateHash(),
    }
}
