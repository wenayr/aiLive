import type { tArenaCommand, tArenaEvent, tArenaScenario, tArenaState } from '../contracts/arena-contracts'
import { copyArenaJson } from '../utility/arena-json'
import { createArenaInitialState, hashArenaState, stepArena } from './simulation'

export function replayArena(deps: {
    scenario: tArenaScenario
    commands: tArenaCommand[]
    ticks: number
}) {
    let state = createArenaInitialState(deps.scenario)
    const events: tArenaEvent[] = []
    for (let index = 0; index < deps.ticks; index += 1) {
        const commands = deps.commands.filter(function scheduledForTick(command) { return command.tick == state.tick })
        const step = stepArena(state, deps.scenario, commands)
        state = step.state
        events.push(...step.events)
    }
    return {
        state: copyArenaJson(state) as tArenaState,
        events: copyArenaJson(events),
        stateHash: hashArenaState(state),
    }
}
