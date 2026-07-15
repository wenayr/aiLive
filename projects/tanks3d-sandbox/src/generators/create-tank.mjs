const archetypes = {
    player: {color: '#9e8bff', hp: 4, speed: 3.3, shellSpeed: 8, model: {bodyLength: 38, bodyWidth: 22, trackWidth: 7, turretRadius: 10, barrelLength: 30}},
    scout: {color: '#ffcb7a', hp: 1, speed: 1.7, shellSpeed: 7, model: {bodyLength: 30, bodyWidth: 18, trackWidth: 5, turretRadius: 8, barrelLength: 24}},
    brute: {color: '#f3788f', hp: 3, speed: .8, shellSpeed: 6, model: {bodyLength: 42, bodyWidth: 26, trackWidth: 8, turretRadius: 12, barrelLength: 28}},
    artillery: {color: '#7fe5e1', hp: 2, speed: 1.1, shellSpeed: 11, model: {bodyLength: 36, bodyWidth: 20, trackWidth: 6, turretRadius: 9, barrelLength: 42}},
}

export function createTank({id, archetype, x, y, heading = -Math.PI / 2}) {
    const design = archetypes[archetype]
    if (!design) throw new Error(`Unknown tank archetype: ${archetype}`)
    if (!id?.trim()) throw new Error('Tank generator needs a stable id')
    return {...design, id, archetype, x, y, heading, turret: heading, alive: true, model: {...design.model}}
}

export function listTankArchetypes() {
    return Object.keys(archetypes)
}
