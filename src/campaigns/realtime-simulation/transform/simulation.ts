import {
    arenaProtocolVersion,
    type tArenaCommand,
    type tArenaDirection,
    type tArenaEvent,
    type tArenaEventKind,
    type tArenaPoint,
    type tArenaScenario,
    type tArenaState,
    type tArenaStep,
    type tArenaTankState,
} from '../contracts/arena-contracts'
import { copyArenaJson, pointKey } from '../utility/arena-json'
import { hashText } from '../utility/hash'
import { validateArenaProtocolVersion } from './protocol'

const directionDelta: Record<tArenaDirection, tArenaPoint> = {
    north: {x: 0, y: -1},
    east: {x: 1, y: 0},
    south: {x: 0, y: 1},
    west: {x: -1, y: 0},
}

function isInside(scenario: tArenaScenario, value: tArenaPoint) {
    return value.x >= 0 && value.x < scenario.width && value.y >= 0 && value.y < scenario.height
}

function nextPoint(point: tArenaPoint, direction: tArenaDirection) {
    const delta = directionDelta[direction]
    return {x: point.x + delta.x, y: point.y + delta.y}
}

function canonicalCommands(commands: tArenaCommand[]) {
    return commands.slice().sort(function orderCommands(a, b) {
        return a.tick - b.tick || a.sequence - b.sequence || a.actorId.localeCompare(b.actorId) || a.kind.localeCompare(b.kind)
    })
}

function cloneState(state: tArenaState) {
    return copyArenaJson(state)
}

function emit(state: tArenaState, events: tArenaEvent[], kind: tArenaEventKind, data: Record<string, unknown>) {
    state.eventSequence += 1
    events.push({tick: state.tick, sequence: state.eventSequence, kind, data})
}

function findTank(state: tArenaState, id: string) {
    return state.tanks.find(function byId(tank) { return tank.id == id })
}

function isBlocked(scenario: tArenaScenario, point: tArenaPoint) {
    return scenario.blocked.some(function hasBlocked(cell) { return cell.x == point.x && cell.y == point.y })
}

function isTankAt(state: tArenaState, point: tArenaPoint, excludedId: string | null = null) {
    return state.tanks.find(function atPoint(tank) {
        return tank.alive && tank.id != excludedId && tank.position.x == point.x && tank.position.y == point.y
    }) ?? null
}

function rejectCommand(state: tArenaState, events: tArenaEvent[], command: tArenaCommand, reason: string) {
    emit(state, events, 'command-rejected', {
        actorId: command.actorId,
        command: command.kind,
        reason,
    })
}

function applyCommand(state: tArenaState, scenario: tArenaScenario, events: tArenaEvent[], command: tArenaCommand) {
    const protocol = validateArenaProtocolVersion(command.protocolVersion)
    if (!protocol.ok) {
        rejectCommand(state, events, command, protocol.error.code)
        return
    }
    if (command.tick != state.tick) {
        rejectCommand(state, events, command, 'wrong-tick')
        return
    }
    const tank = findTank(state, command.actorId)
    if (!tank || !tank.alive) {
        rejectCommand(state, events, command, 'actor-unavailable')
        return
    }

    if (command.kind == 'turn-body') {
        tank.body = command.direction
        emit(state, events, 'tank-turned-body', {tankId: tank.id, direction: tank.body})
        return
    }
    if (command.kind == 'turn-turret') {
        tank.turret = command.direction
        emit(state, events, 'tank-turned-turret', {tankId: tank.id, direction: tank.turret})
        return
    }
    if (command.kind == 'move') {
        const target = nextPoint(tank.position, tank.body)
        if (!isInside(scenario, target) || isBlocked(scenario, target) || isTankAt(state, target, tank.id)) {
            rejectCommand(state, events, command, 'movement-blocked')
            return
        }
        tank.position = target
        emit(state, events, 'tank-moved', {tankId: tank.id, position: target})
        return
    }
    if (tank.cooldown > 0) {
        rejectCommand(state, events, command, 'weapon-cooling-down')
        return
    }
    const projectile = {
        id: `p-${state.nextProjectileId}`,
        ownerId: tank.id,
        position: copyArenaJson(tank.position),
        direction: tank.turret,
        damage: 25,
    }
    state.nextProjectileId += 1
    tank.cooldown = 3
    state.projectiles.push(projectile)
    emit(state, events, 'projectile-fired', {projectileId: projectile.id, tankId: tank.id, direction: projectile.direction})
}

function advanceProjectiles(state: tArenaState, scenario: tArenaScenario, events: tArenaEvent[]) {
    const survivors = []
    for (const projectile of state.projectiles.sort(function byProjectileId(a, b) { return a.id.localeCompare(b.id) })) {
        const target = nextPoint(projectile.position, projectile.direction)
        if (!isInside(scenario, target) || isBlocked(scenario, target)) {
            emit(state, events, 'projectile-blocked', {projectileId: projectile.id, position: target})
            continue
        }
        const tank = isTankAt(state, target, projectile.ownerId)
        if (!tank) {
            survivors.push({...projectile, position: target})
            continue
        }
        tank.hp = Math.max(0, tank.hp - projectile.damage)
        emit(state, events, 'tank-damaged', {tankId: tank.id, projectileId: projectile.id, hp: tank.hp})
        if (tank.hp == 0) {
            tank.alive = false
            emit(state, events, 'tank-destroyed', {tankId: tank.id})
        }
    }
    state.projectiles = survivors
}

export function createArenaInitialState(scenario: tArenaScenario): tArenaState {
    return {
        protocolVersion: arenaProtocolVersion,
        scenarioId: scenario.id,
        tick: 0,
        eventSequence: 0,
        nextProjectileId: 1,
        tanks: scenario.spawns.map(function createTank(spawn): tArenaTankState {
            return {
                id: spawn.id,
                team: spawn.team,
                position: copyArenaJson(spawn.position),
                body: spawn.body,
                turret: spawn.turret,
                hp: 100,
                cooldown: 0,
                alive: true,
            }
        }).sort(function byTankId(a, b) { return a.id.localeCompare(b.id) }),
        projectiles: [],
    }
}

export function stepArena(state: tArenaState, scenario: tArenaScenario, commands: tArenaCommand[]): tArenaStep {
    const next = cloneState(state)
    const events: tArenaEvent[] = []
    for (const tank of next.tanks) tank.cooldown = Math.max(0, tank.cooldown - 1)
    for (const command of canonicalCommands(commands)) applyCommand(next, scenario, events, command)
    advanceProjectiles(next, scenario, events)
    next.tanks.sort(function byTankId(a, b) { return a.id.localeCompare(b.id) })
    next.projectiles.sort(function byProjectileId(a, b) { return a.id.localeCompare(b.id) })
    next.tick += 1
    return {state: next, events}
}

export function hashArenaState(state: tArenaState) {
    const canonical = {
        protocolVersion: state.protocolVersion,
        scenarioId: state.scenarioId,
        tick: state.tick,
        nextProjectileId: state.nextProjectileId,
        tanks: state.tanks.map(function tank(tank) {
            return {
                id: tank.id,
                team: tank.team,
                position: tank.position,
                body: tank.body,
                turret: tank.turret,
                hp: tank.hp,
                cooldown: tank.cooldown,
                alive: tank.alive,
            }
        }).sort(function byTankId(a, b) { return a.id.localeCompare(b.id) }),
        projectiles: state.projectiles.map(function projectile(projectile) {
            return {
                id: projectile.id,
                ownerId: projectile.ownerId,
                position: projectile.position,
                direction: projectile.direction,
                damage: projectile.damage,
            }
        }).sort(function byProjectileId(a, b) { return a.id.localeCompare(b.id) }),
    }
    return hashText(JSON.stringify(canonical))
}

export function createArenaSimulation(deps: {scenario: tArenaScenario}) {
    let state = createArenaInitialState(deps.scenario)
    const commandTrace: tArenaCommand[] = []
    const eventTrace: tArenaEvent[] = []

    function snapshot() {
        return cloneState(state)
    }

    function tick(commands: tArenaCommand[]) {
        const step = stepArena(state, deps.scenario, commands)
        state = step.state
        commandTrace.push(...canonicalCommands(commands))
        eventTrace.push(...step.events)
        return {state: snapshot(), events: copyArenaJson(step.events)}
    }

    return {
        runtime: {snapshot, tick, stateHash: () => hashArenaState(state)},
        debug: {events: () => copyArenaJson(eventTrace)},
        testing: {
            commands: () => copyArenaJson(commandTrace),
            inject: tick,
        },
    }
}
