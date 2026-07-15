import { createTank } from './create-tank.mjs'

export function createWave({round, spawnPads}) {
    const count = Math.min(spawnPads.length, 1 + round)
    return spawnPads.slice(0, count).map(function spawn(pad, index) {
        const archetype = chooseArchetype({round, index, count})
        return createTank({
            id: `round-${round}-enemy-${index + 1}`,
            archetype,
            x: pad[0],
            y: pad[1],
        })
    })
}

function chooseArchetype({round, index, count}) {
    if (round > 3 && index == Math.floor(count / 2)) return 'artillery'
    if (round > 2 && index == 0) return 'brute'
    if (round > 1 && index == count - 1) return 'brute'
    return 'scout'
}
