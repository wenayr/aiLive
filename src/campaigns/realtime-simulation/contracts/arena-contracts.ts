export const arenaProtocolVersion = 'arena/v1' as const

export type tArenaProtocolVersion = typeof arenaProtocolVersion

export type tArenaDirection = 'north' | 'east' | 'south' | 'west'

export type tArenaPoint = {
    x: number
    y: number
}

export type tArenaSpawn = {
    id: string
    team: 'alpha' | 'bravo'
    position: tArenaPoint
    body: tArenaDirection
    turret: tArenaDirection
}

export type tArenaScenarioSpec = {
    id: string
    seed: string
    width: number
    height: number
    obstacleRate: number
    spawns?: tArenaSpawn[]
}

export type tArenaScenario = {
    protocolVersion: tArenaProtocolVersion
    id: string
    seed: string
    width: number
    height: number
    blocked: tArenaPoint[]
    spawns: tArenaSpawn[]
}

export type tArenaTankState = {
    id: string
    team: 'alpha' | 'bravo'
    position: tArenaPoint
    body: tArenaDirection
    turret: tArenaDirection
    hp: number
    cooldown: number
    alive: boolean
}

export type tArenaProjectileState = {
    id: string
    ownerId: string
    position: tArenaPoint
    direction: tArenaDirection
    damage: number
}

export type tArenaState = {
    protocolVersion: tArenaProtocolVersion
    scenarioId: string
    tick: number
    eventSequence: number
    nextProjectileId: number
    tanks: tArenaTankState[]
    projectiles: tArenaProjectileState[]
}

export type tArenaCommandBase = {
    protocolVersion: tArenaProtocolVersion
    tick: number
    sequence: number
    actorId: string
}

export type tArenaCommand =
    | (tArenaCommandBase & {kind: 'move'})
    | (tArenaCommandBase & {kind: 'turn-body', direction: tArenaDirection})
    | (tArenaCommandBase & {kind: 'turn-turret', direction: tArenaDirection})
    | (tArenaCommandBase & {kind: 'fire'})

export type tArenaCommandIntentBase = {
    protocolVersion: string
    clientCommandId: string
    actorId: string
}

export type tArenaCommandIntent =
    | (tArenaCommandIntentBase & {kind: 'move' | 'fire'})
    | (tArenaCommandIntentBase & {kind: 'turn-body' | 'turn-turret', direction: tArenaDirection})

export type tArenaCommandOutcome =
    | {
        accepted: true
        clientCommandId: string
        scheduledTick: number
        sequence: number
    }
    | {
        accepted: false
        clientCommandId: string | null
        code: 'ARENA_PROTOCOL_UNSUPPORTED' | 'ARENA_COMMAND_INVALID'
    }

export type tArenaEventKind =
    | 'command-rejected'
    | 'tank-moved'
    | 'tank-turned-body'
    | 'tank-turned-turret'
    | 'projectile-fired'
    | 'projectile-blocked'
    | 'tank-damaged'
    | 'tank-destroyed'

export type tArenaEvent = {
    tick: number
    sequence: number
    kind: tArenaEventKind
    data: Record<string, unknown>
}

export type tArenaStep = {
    state: tArenaState
    events: tArenaEvent[]
}

export type tArenaLiveUpdate = {
    state: tArenaState
    events: tArenaEvent[]
    stateHash: string
    source: 'tick'
}

export type tArenaMetrics = {
    running: boolean
    tickMs: number
    ticksExecuted: number
    pendingCommands: number
    stateHash: string
}

export type tArenaProtocolError = {
    code: 'ARENA_PROTOCOL_UNSUPPORTED'
    expected: tArenaProtocolVersion
    received: string
}
