const archetypes = {
    player: {color: '#9e8bff', hp: 4, speed: 3.3},
    scout: {color: '#ffcb7a', hp: 1, speed: 1.7},
    brute: {color: '#f3788f', hp: 3, speed: .8},
}

export function createTank({id, archetype, x, y, heading = -Math.PI / 2}) {
    const design = archetypes[archetype]
    if (!design) throw new Error(`Unknown tank archetype: ${archetype}`)
    if (!id?.trim()) throw new Error('Tank generator needs a stable id')
    return {id, archetype, x, y, heading, turret: heading, alive: true, ...design}
}

export function listTankArchetypes() {
    return Object.keys(archetypes)
}
