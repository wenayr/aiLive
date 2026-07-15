export function createArena({seed, size = 13}) {
    const random = createSeededRandom(seed)
    const walls = []
    const spawnPads = [[1, 1], [size - 2, 1], [1, size - 2], [size - 2, size - 2], [Math.floor(size / 2), 1]]
    for (let y = 2; y < size - 2; y += 1) {
        for (let x = 2; x < size - 2; x += 1) {
            const distanceToCenter = Math.abs(x - Math.floor(size / 2)) + Math.abs(y - Math.floor(size / 2))
            if (distanceToCenter > 1 && random() > .78) walls.push([x, y])
        }
    }
    return {seed, size, walls, spawnPads}
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
