import {
    arenaProtocolVersion,
    type tArenaPoint,
    type tArenaScenario,
    type tArenaScenarioSpec,
    type tArenaSpawn,
} from '../contracts/arena-contracts'
import { comparePoints, pointKey } from '../utility/arena-json'
import { hashText } from '../utility/hash'

function createRandom(seed: string) {
    let value = Number.parseInt(hashText(seed), 16) >>> 0
    return function nextRandom() {
        value += 0x6D2B79F5
        let next = value
        next = Math.imul(next ^ (next >>> 15), next | 1)
        next ^= next + Math.imul(next ^ (next >>> 7), next | 61)
        return ((next ^ (next >>> 14)) >>> 0) / 4_294_967_296
    }
}

function point(x: number, y: number): tArenaPoint {
    return {x, y}
}

function defaultSpawns(width: number, height: number): tArenaSpawn[] {
    return [
        {id: 'alpha-1', team: 'alpha', position: point(1, 1), body: 'east', turret: 'east'},
        {id: 'bravo-1', team: 'bravo', position: point(width - 2, height - 2), body: 'west', turret: 'west'},
    ]
}

function pointInside(width: number, height: number, value: tArenaPoint) {
    return value.x >= 0 && value.x < width && value.y >= 0 && value.y < height
}

function neighbors(value: tArenaPoint) {
    return [
        point(value.x, value.y - 1),
        point(value.x + 1, value.y),
        point(value.x, value.y + 1),
        point(value.x - 1, value.y),
    ]
}

export function scenarioHasConnectedSpawns(scenario: tArenaScenario) {
    if (!scenario.spawns.length) return false
    const blocked = new Set(scenario.blocked.map(pointKey))
    const visited = new Set<string>()
    const pending = [scenario.spawns[0].position]

    while (pending.length) {
        const current = pending.shift()!
        const key = pointKey(current)
        if (visited.has(key)) continue
        visited.add(key)
        for (const candidate of neighbors(current)) {
            if (!pointInside(scenario.width, scenario.height, candidate)) continue
            if (blocked.has(pointKey(candidate)) || visited.has(pointKey(candidate))) continue
            pending.push(candidate)
        }
    }

    return scenario.spawns.every(function spawnReachable(spawn) { return visited.has(pointKey(spawn.position)) })
}

export function validateArenaScenario(scenario: tArenaScenario) {
    if (scenario.protocolVersion != arenaProtocolVersion) return false
    if (scenario.width < 5 || scenario.height < 5) return false
    if (!scenario.spawns.length) return false
    const occupied = new Set<string>()
    for (const spawn of scenario.spawns) {
        if (!pointInside(scenario.width, scenario.height, spawn.position)) return false
        const key = pointKey(spawn.position)
        if (occupied.has(key)) return false
        occupied.add(key)
    }
    const blocked = new Set<string>()
    for (const obstacle of scenario.blocked) {
        if (!pointInside(scenario.width, scenario.height, obstacle)) return false
        const key = pointKey(obstacle)
        if (blocked.has(key) || occupied.has(key)) return false
        blocked.add(key)
    }
    return scenarioHasConnectedSpawns(scenario)
}

export function createArenaScenario(spec: tArenaScenarioSpec): tArenaScenario {
    if (spec.width < 5 || spec.height < 5) throw new Error('Arena dimensions must be at least 5x5')
    if (spec.obstacleRate < 0 || spec.obstacleRate > 0.35) throw new Error('Obstacle rate must be between 0 and 0.35')
    const spawns = spec.spawns ?? defaultSpawns(spec.width, spec.height)
    const spawnKeys = new Set(spawns.map(function spawnKey(spawn) { return pointKey(spawn.position) }))

    for (let attempt = 0; attempt < 12; attempt += 1) {
        const random = createRandom(`${spec.seed}:${attempt}`)
        const blocked: tArenaPoint[] = []
        for (let y = 0; y < spec.height; y += 1) {
            for (let x = 0; x < spec.width; x += 1) {
                const candidate = point(x, y)
                if (spawnKeys.has(pointKey(candidate))) continue
                if (random() < spec.obstacleRate) blocked.push(candidate)
            }
        }
        const scenario: tArenaScenario = {
            protocolVersion: arenaProtocolVersion,
            id: spec.id,
            seed: spec.seed,
            width: spec.width,
            height: spec.height,
            blocked: blocked.sort(comparePoints),
            spawns,
        }
        if (validateArenaScenario(scenario)) return scenario
    }

    return {
        protocolVersion: arenaProtocolVersion,
        id: spec.id,
        seed: spec.seed,
        width: spec.width,
        height: spec.height,
        blocked: [],
        spawns,
    }
}
