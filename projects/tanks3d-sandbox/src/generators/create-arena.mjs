const arenaProfiles = {
    crossroads: function createCrossroads({size}) {
        const center = Math.floor(size / 2)
        return coordinates(size, function crossroads(x, y) {
            return (y == center - 2 || y == center + 2) && x != center
                || (x == center - 2 || x == center + 2) && y != center
        })
    },
    ring: function createRing({size}) {
        return coordinates(size, function ring(x, y) {
            return (x == 3 || x == size - 4) && y >= 3 && y <= size - 4
                || (y == 3 || y == size - 4) && x >= 3 && x <= size - 4
        })
    },
    islands: function createIslands({size, random}) {
        return coordinates(size, function islands(x, y) {
            const quadrant = (x < size / 2 ? 0 : 1) + (y < size / 2 ? 0 : 2)
            const distance = Math.abs(x - (quadrant % 2 ? size - 3 : 2)) + Math.abs(y - (quadrant > 1 ? size - 3 : 2))
            return distance < 2 || distance > 3 && random() > .86
        })
    },
}

export function createArena({seed, kind = 'crossroads', size = 13}) {
    const profile = arenaProfiles[kind]
    if (!profile) throw new Error(`Unknown arena kind: ${kind}`)
    const random = createSeededRandom(`${seed}:${kind}`)
    const spawnPads = [[1, 1], [size - 2, 1], [1, size - 2], [size - 2, size - 2], [Math.floor(size / 2), 1]]
    return {seed, kind, size, walls: profile({size, random}), spawnPads}
}

export function listArenaKinds() {
    return Object.keys(arenaProfiles)
}

function coordinates(size, predicate) {
    const walls = []
    for (let y = 2; y < size - 2; y += 1) {
        for (let x = 2; x < size - 2; x += 1) if (predicate(x, y)) walls.push([x, y])
    }
    return walls
}

function createSeededRandom(seed) {
    let value = [...String(seed)].reduce(function hash(result, character) {
        return (result * 31 + character.charCodeAt(0)) >>> 0
    }, 2166136261)
    return function next() {
        value += 0x6D2B79F5
        let output = value
        output = Math.imul(output ^ output >>> 15, output | 1)
        output ^= output + Math.imul(output ^ output >>> 7, output | 61)
        return ((output ^ output >>> 14) >>> 0) / 4294967296
    }
}
