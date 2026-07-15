import { createArena } from '../generators/create-arena.mjs'
import { createTank } from '../generators/create-tank.mjs'

export function createFieldTest({seed = 'visual-field', mapKind = 'crossroads'} = {}) {
    const arena = createArena({seed, kind: mapKind})
    const player = createTank({id: 'field-player', archetype: 'player', x: 6, y: 10})
    const blocks = arena.walls.map(function createBlock(cell, index) {
        return {id: `block-${index + 1}`, x: cell[0] + .5, y: cell[1] + .5, hp: index % 4 == 0 ? 2 : 1, alive: true}
    })
    const shells = []
    const effects = []
    let lastShotAt = 0

    function update({delta, now, input}) {
        rotatePlayer(delta, input)
        movePlayer(delta, input)
        if (input.fire && now - lastShotAt > 260) {
            shoot()
            lastShotAt = now
        }
        moveShells(delta)
        effects.forEach(function fade(effect) { effect.life -= delta })
        removeExpired()
    }

    function rotatePlayer(delta, input) {
        if (input.left) player.heading -= delta * 2.6
        if (input.right) player.heading += delta * 2.6
        if (input.aim) player.turret = Math.atan2(input.aim.y - player.y, input.aim.x - player.x)
    }

    function movePlayer(delta, input) {
        const direction = (input.forward ? 1 : 0) - (input.backward ? 1 : 0)
        const x = Math.max(.5, Math.min(arena.size - 1.5, player.x + Math.cos(player.heading) * direction * delta * player.speed))
        const y = Math.max(.5, Math.min(arena.size - 1.5, player.y + Math.sin(player.heading) * direction * delta * player.speed))
        if (!blocks.some(function blocked(block) { return block.alive && Math.hypot(block.x - x, block.y - y) < .75 })) {
            player.x = x
            player.y = y
        }
    }

    function shoot() {
        shells.push({x: player.x, y: player.y, vx: Math.cos(player.turret) * player.shellSpeed, vy: Math.sin(player.turret) * player.shellSpeed, life: 1.4})
    }

    function moveShells(delta) {
        shells.forEach(function move(shell) {
            shell.x += shell.vx * delta
            shell.y += shell.vy * delta
            shell.life -= delta
            const block = blocks.find(function hit(candidate) { return candidate.alive && Math.hypot(shell.x - candidate.x, shell.y - candidate.y) < .55 })
            if (block) damageBlock(block)
            if (shell.x < 0 || shell.y < 0 || shell.x > arena.size || shell.y > arena.size) shell.life = 0
        })
    }

    function damageBlock(block) {
        block.hp -= 1
        effects.push({x: block.x, y: block.y, life: .42, color: block.hp < 1 ? '#fff0a6' : '#ffd08a'})
        if (block.hp < 1) block.alive = false
    }

    function removeExpired() {
        while (shells.length && shells[0].life <= 0) shells.shift()
        while (effects.length && effects[0].life <= 0) effects.shift()
    }

    return {
        api: {
            snapshot: function snapshot() { return {arena, player, enemies: [], shells, effects, cores: [], blocks} },
            status: function status() {
                return {
                    mapKind: arena.kind,
                    objects: blocks.filter(alive).length,
                    destroyed: blocks.filter(function destroyed(block) { return !block.alive }).length,
                }
            },
        },
        runtime: {update},
    }
}

function alive(subject) { return subject.alive }
