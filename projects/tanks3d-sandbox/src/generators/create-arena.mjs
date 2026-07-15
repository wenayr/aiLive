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
    islands: function createIslands({size, random, corePads}) {
        return coordinates(size, function islands(x, y) {
            const quadrant = (x < size / 2 ? 0 : 1) + (y < size / 2 ? 0 : 2)
            const distance = Math.abs(x - (quadrant % 2 ? size - 3 : 2)) + Math.abs(y - (quadrant > 1 ? size - 3 : 2))
            return !containsPad(corePads, x, y) && (distance < 2 || distance > 3 && random() > .86)
        })
    },
    zigzag: function createZigzag({size}) {
        return coordinates(size, function zigzag(x, y) {
            return (x + y) % 5 == 0 && x > 2 || y == 6 && x % 3 != 0
        })
    },
    orchard: function createOrchard({size}) {
        return coordinates(size, function orchard(x, y) {
            return x % 3 == 0 && y % 3 == 0 || x == 5 && y == 8
        })
    },
    turbine: function createTurbine({size}) {
        const center = Math.floor(size / 2)
        return coordinates(size, function turbine(x, y) {
            return x == center && Math.abs(y - center) > 1
                || y == center && Math.abs(x - center) > 1
                || Math.abs(x - center) == Math.abs(y - center) && Math.abs(x - center) == 3
        })
    },
    canyon: function createCanyon({size}) {
        return coordinates(size, function canyon(x, y) {
            return x == 3 + (y % 3 == 0 ? 1 : 0) || x == size - 4 - (y % 3 == 1 ? 1 : 0)
        })
    },
    delta: function createDelta({size}) {
        const center = Math.floor(size / 2)
        return coordinates(size, function delta(x, y) {
            return y >= 4 && (x == center || x == center - (y - 4) || x == center + (y - 4))
        })
    },
    crater: function createCrater({size}) {
        const center = Math.floor(size / 2)
        return coordinates(size, function crater(x, y) {
            const distance = Math.abs(x - center) + Math.abs(y - center)
            return distance == 3 || distance == 5 && (x + y) % 2 == 0
        })
    },
    shards: function createShards({size, random}) {
        return coordinates(size, function shards(x, y) {
            return random() > .72 && (x * 3 + y) % 4 != 0
        })
    },
}

const arenaPalettes = {
    crossroads: {background: '#10102a', tileA: '#22214c', tileB: '#29275b', wall: '#59508b', core: '#8ff9ee'},
    ring: {background: '#251016', tileA: '#53212f', tileB: '#672b3d', wall: '#a04c61', core: '#ffe68b'},
    islands: {background: '#091a31', tileA: '#164466', tileB: '#1b527c', wall: '#3f7fa8', core: '#8ff9ee'},
    zigzag: {background: '#261123', tileA: '#572552', tileB: '#6e3268', wall: '#bd5db1', core: '#ffd0f6'},
    orchard: {background: '#0f2113', tileA: '#264c2b', tileB: '#32643a', wall: '#7dba63', core: '#fff0a8'},
    turbine: {background: '#17151f', tileA: '#3a3748', tileB: '#4c485e', wall: '#a69ac8', core: '#94f2ff'},
    canyon: {background: '#25190e', tileA: '#654124', tileB: '#7a512e', wall: '#cf8b4b', core: '#fff3a0'},
    delta: {background: '#071e23', tileA: '#14515b', tileB: '#1b6671', wall: '#58c6c7', core: '#d4ff9d'},
    crater: {background: '#1f1111', tileA: '#522428', tileB: '#6c3034', wall: '#e36e62', core: '#ffd7a4'},
    shards: {background: '#151326', tileA: '#37305f', tileB: '#473d78', wall: '#a995ff', core: '#8dfff2'},
}

export function createArena({seed, kind = 'crossroads', size = 13}) {
    const profile = arenaProfiles[kind]
    if (!profile) throw new Error(`Unknown arena kind: ${kind}`)
    const random = createSeededRandom(`${seed}:${kind}`)
    const spawnPads = [[1, 1], [size - 2, 1], [1, size - 2], [size - 2, size - 2], [Math.floor(size / 2), 1]]
    const corePads = createCorePads({kind, size})
    const walls = profile({size, random, corePads}).filter(function safe(cell) {
        return !containsPad([...spawnPads, ...corePads, [6, 10]], cell[0], cell[1])
    })
    return {seed, kind, size, palette: arenaPalettes[kind], walls, spawnPads, corePads}
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

function createCorePads({kind, size}) {
    const center = Math.floor(size / 2)
    if (kind == 'islands' || kind == 'delta') return [[center, 3], [3, center], [size - 4, center]]
    return [[center, 2], [2, center], [size - 3, center]]
}

function containsPad(pads, x, y) {
    return pads.some(function samePad(pad) { return pad[0] == x && pad[1] == y })
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
