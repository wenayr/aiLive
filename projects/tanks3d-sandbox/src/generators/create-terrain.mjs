export function createTerrain({seed = 'terrain', kind = 'canyon', size = 130} = {}) {
    const random = createSeededRandom(`${seed}:${kind}:terrain`)
    const landmarks = []
    const nearStart = [[18, 6], [13, 5], [8, 7], [20, 9]]
    for (let index = 0; index < 26; index += 1) {
        const known = nearStart[index]
        const x = known ? known[0] : 5 + random() * (size - 10)
        const y = known ? known[1] : 5 + random() * (size - 10)
        landmarks.push({
            id: `landmark-${index + 1}`,
            kind: ['boulder', 'arch', 'spire', 'pond'][index % 4],
            x,
            y,
            scale: .6 + random() * 1.2,
            hue: index % 3,
        })
    }
    return {kind, size, heightAt: createHeightSampler({kind, seed}), landmarks}
}

function createHeightSampler({kind, seed}) {
    const phase = [...seed].reduce(function sum(total, character) { return total + character.charCodeAt(0) }, 0) / 23
    const amplitude = kind == 'canyon' ? .72 : kind == 'crater' ? .85 : kind == 'islands' ? .6 : .42
    return function heightAt(x, y) {
        const waves = Math.sin(x * .19 + phase) * .46 + Math.cos(y * .17 - phase) * .34 + Math.sin((x + y) * .11) * .2
        const crater = kind == 'crater' ? -Math.max(0, 1 - Math.hypot(x - 65, y - 65) / 30) * .7 : 0
        const canyon = kind == 'canyon' ? Math.sin(y * .12) * Math.exp(-Math.pow((x - 65) / 22, 2)) * .65 : 0
        return (waves + crater + canyon) * amplitude
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
