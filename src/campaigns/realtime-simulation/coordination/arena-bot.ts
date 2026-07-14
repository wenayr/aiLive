import {
    arenaProtocolVersion,
    type tArenaCommand,
    type tArenaDirection,
    type tArenaState,
} from '../contracts/arena-contracts'

function directionToward(from: {x: number, y: number}, to: {x: number, y: number}): tArenaDirection | null {
    if (from.x < to.x) return 'east'
    if (from.x > to.x) return 'west'
    if (from.y < to.y) return 'south'
    if (from.y > to.y) return 'north'
    return null
}

export function createArenaBot(deps: {actorId: string}) {
    function commandFor(state: tArenaState): tArenaCommand | null {
        const actor = state.tanks.find(function byId(tank) { return tank.id == deps.actorId })
        if (!actor?.alive) return null
        const target = state.tanks
            .filter(function isOpponent(tank) { return tank.alive && tank.team != actor.team })
            .sort(function byId(a, b) { return a.id.localeCompare(b.id) })[0]
        if (!target) return null

        const direction = directionToward(actor.position, target.position)
        if (!direction) return null
        if (actor.position.x == target.position.x || actor.position.y == target.position.y) {
            if (actor.turret != direction) {
                return {
                    protocolVersion: arenaProtocolVersion,
                    tick: state.tick,
                    sequence: 1,
                    actorId: actor.id,
                    kind: 'turn-turret',
                    direction,
                }
            }
            if (actor.cooldown == 0) {
                return {
                    protocolVersion: arenaProtocolVersion,
                    tick: state.tick,
                    sequence: 1,
                    actorId: actor.id,
                    kind: 'fire',
                }
            }
            return null
        }
        if (actor.body != direction) {
            return {
                protocolVersion: arenaProtocolVersion,
                tick: state.tick,
                sequence: 1,
                actorId: actor.id,
                kind: 'turn-body',
                direction,
            }
        }
        return {
            protocolVersion: arenaProtocolVersion,
            tick: state.tick,
            sequence: 1,
            actorId: actor.id,
            kind: 'move',
        }
    }

    return {api: {commandFor}}
}

export type tArenaBot = ReturnType<typeof createArenaBot>
