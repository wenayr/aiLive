export function createCoastalWorld({seed = 'tideline', size = 130} = {}) {
    const random = createRandom(seed)
    const flora = []
    const cover = []
    for (let index = 0; index < 360; index += 1) {
        const x = 3 + random() * (size - 6)
        const y = 3 + random() * (size - 6)
        if (isSea(x, y, size) || Math.hypot(x - 12, y - 18) < 9) continue
        const type = random() < .62 ? 'tree' : random() < .9 ? 'bush' : 'stone'
        const target = type == 'stone' ? cover : flora
        target.push({id: `${type}-${index}`, x, y, type, scale: .5 + random() * 1.25, tone: random() > .5 ? 'sunny' : 'shade', hp: type == 'stone' ? 2 : 1, alive: true})
    }
    return {
        seed,
        size,
        flora,
        cover,
        heightAt: function heightAt(x, y) { return terrainHeight(x, y, size) },
        isSea: function sea(x, y) { return isSea(x, y, size) },
    }
}

function isSea(x, y, size) {
    return y < size * .2 + Math.sin(x * .09) * 3 + Math.sin(x * .027) * 5
}

function terrainHeight(x, y, size) {
    const rolling = Math.sin(x * .07) * .46 + Math.cos(y * .08) * .31 + Math.sin((x + y) * .035) * .34
    const inlandRise = Math.max(0, y / size - .22) * 2.6
    const ridge = Math.max(0, 1 - Math.abs(x - size * .73) / 25) * Math.max(0, y / size - .44) * 3.2
    return rolling + inlandRise + ridge
}

function createRandom(seed) {
    let state = [...seed].reduce(function hash(value, char) { return (value * 31 + char.charCodeAt(0)) >>> 0 }, 2166136261)
    return function random() {
        state += 0x6D2B79F5
        let value = state
        value = Math.imul(value ^ value >>> 15, value | 1)
        value ^= value + Math.imul(value ^ value >>> 7, value | 61)
        return ((value ^ value >>> 14) >>> 0) / 4294967296
    }
}
