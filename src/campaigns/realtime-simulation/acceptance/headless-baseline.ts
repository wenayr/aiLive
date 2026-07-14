import { arenaProtocolVersion, type tArenaEvent, type tArenaScenario } from '../contracts/arena-contracts'
import { runBotArena } from '../coordination/run-bot-arena'
import { replayArena } from '../transform/replay'

function countEvents(events: tArenaEvent[]) {
    const counts: Partial<Record<tArenaEvent['kind'], number>> = {}
    for (const event of events) counts[event.kind] = (counts[event.kind] ?? 0) + 1
    return counts
}

export function createHeadlessBaselineScenario(): tArenaScenario {
    return {
        protocolVersion: arenaProtocolVersion,
        id: 'headless-bot-arena',
        seed: 'headless-bots',
        width: 10,
        height: 3,
        blocked: [],
        spawns: [
            {id: 'alpha-1', team: 'alpha', position: {x: 1, y: 1}, body: 'east', turret: 'east'},
            {id: 'bravo-1', team: 'bravo', position: {x: 8, y: 1}, body: 'west', turret: 'west'},
        ],
    }
}

export function runHeadlessBaseline() {
    const scenario = createHeadlessBaselineScenario()
    const live = runBotArena({scenario, ticks: 16})
    const replay = replayArena({scenario, commands: live.commands.slice().reverse(), ticks: 16})

    return {
        scenario: {
            id: scenario.id,
            seed: scenario.seed,
            width: scenario.width,
            height: scenario.height,
            spawns: scenario.spawns.map(function spawn(spawn) { return spawn.id }),
        },
        ticks: live.state.tick,
        commandCount: live.commands.length,
        eventCounts: countEvents(live.events),
        liveStateHash: live.stateHash,
        replayStateHash: replay.stateHash,
        replayMatchesLive: live.stateHash == replay.stateHash,
        tanks: live.state.tanks.map(function tank(tank) {
            return {id: tank.id, hp: tank.hp, alive: tank.alive, position: tank.position}
        }),
    }
}
