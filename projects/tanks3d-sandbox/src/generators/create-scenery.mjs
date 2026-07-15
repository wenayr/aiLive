export function createScenery({seed = 'scenery', kind = 'canyon', size = 130} = {}) {
    const random = createSeededRandom(`${seed}:${kind}:scenery`)
    const features = []
    const foreground = [[7, 6], [15, 5], [23, 8], [31, 6]]
    for (let index = 0; index < 34; index += 1) {
        features.push({
            id: `scenery-${index + 1}`,
            x: foreground[index]?.[0] ?? 4 + random() * (size - 8),
            y: foreground[index]?.[1] ?? 4 + random() * (size - 8),
            form: index % 3 == 0 ? 'spire' : index % 3 == 1 ? 'shrub' : 'slab',
            scale: .5 + random() * 1.35,
            tone: random() > .5 ? 'warm' : 'cool',
        })
    }
    return {heightAt: createHeightAt({seed, kind}), features}
}

function createHeightAt({seed, kind}) {
    const phase = [...seed].reduce(function sum(total, letter) { return total + letter.charCodeAt(0) }, 0) * .021
    return function heightAt(x, y) {
        const broad = Math.sin(x * .075 + phase) * .7 + Math.cos(y * .095 - phase) * .5
        const fine = Math.sin((x - y) * .2) * .16
        const basin = kind == 'crater' ? -Math.max(0, 1 - Math.hypot(x - 65, y - 65) / 34) * .8 : 0
        return broad + fine + basin
    }
}

function createSeededRandom(seed) {
    let value = [...String(seed)].reduce(function hash(result, character) { return (result * 31 + character.charCodeAt(0)) >>> 0 }, 2166136261)
    return function next() {
        value += 0x6D2B79F5
        let output = value
        output = Math.imul(output ^ output >>> 15, output | 1)
        output ^= output + Math.imul(output ^ output >>> 7, output | 61)
        return ((output ^ output >>> 14) >>> 0) / 4294967296
    }
}
