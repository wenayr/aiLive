import {
    arenaProtocolVersion,
    type tArenaCommandIntent,
    type tArenaProtocolError,
    type tArenaProtocolVersion,
} from '../contracts/arena-contracts'

function record(value: unknown): value is Record<string, unknown> {
    return value != null && typeof value == 'object' && !Array.isArray(value)
}

function direction(value: unknown): value is 'north' | 'east' | 'south' | 'west' {
    return value == 'north' || value == 'east' || value == 'south' || value == 'west'
}

export function validateArenaProtocolVersion(version: unknown):
    | {ok: true, version: tArenaProtocolVersion}
    | {ok: false, error: tArenaProtocolError} {
    if (version == arenaProtocolVersion) return {ok: true, version: arenaProtocolVersion}
    return {
        ok: false,
        error: {
            code: 'ARENA_PROTOCOL_UNSUPPORTED',
            expected: arenaProtocolVersion,
            received: typeof version == 'string' ? version : String(version),
        },
    }
}

export function parseArenaCommandIntent(value: unknown):
    | {ok: true, value: tArenaCommandIntent}
    | {ok: false, clientCommandId: string | null} {
    if (!record(value)) return {ok: false, clientCommandId: null}
    const clientCommandId = typeof value.clientCommandId == 'string' ? value.clientCommandId : null
    if (
        typeof value.protocolVersion != 'string'
        || !clientCommandId
        || typeof value.actorId != 'string'
        || typeof value.kind != 'string'
    ) return {ok: false, clientCommandId}
    if (value.kind == 'move' || value.kind == 'fire') {
        return {ok: true, value: {
            protocolVersion: value.protocolVersion,
            clientCommandId,
            actorId: value.actorId,
            kind: value.kind,
        }}
    }
    if ((value.kind == 'turn-body' || value.kind == 'turn-turret') && direction(value.direction)) {
        return {ok: true, value: {
            protocolVersion: value.protocolVersion,
            clientCommandId,
            actorId: value.actorId,
            kind: value.kind,
            direction: value.direction,
        }}
    }
    return {ok: false, clientCommandId}
}
