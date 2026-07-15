import { createArena } from '../generators/create-arena.mjs'
import { createTank } from '../generators/create-tank.mjs'

export function createFieldTest({seed = 'visual-field', mapKind = 'crossroads'} = {}) {
    const arena = createArena({seed, kind: mapKind, size: 130})
    const player = createTank({id: 'field-player', archetype: 'player', x: 12, y: 12})
    const enemies = [
        createTank({id: 'field-scout', archetype: 'scout', x: 19, y: 12}),
        createTank({id: 'field-brute', archetype: 'brute', x: 12, y: 20}),
        createTank({id: 'field-artillery', archetype: 'artillery', x: 21, y: 21}),
    ]
    const blocks = arena.walls.map(function createBlock(cell, index) {
        return {id: `block-${index + 1}`, x: cell[0] + .5, y: cell[1] + .5, hp: index % 4 == 0 ? 2 : 1, alive: true}
    })
    const shells = []
    const effects = []
    let lastShotAt = 0
    let lastEnemyShotAt = 0

    function update({delta, now, input}) {
        rotatePlayer(delta, input)
        movePlayer(delta, input)
        if (input.fire && now - lastShotAt > 260) {
            shoot()
            lastShotAt = now
        }
        moveShells(delta)
        moveEnemies({delta, now})
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

    function shoot(owner = player) {
        shells.push({owner, x: owner.x, y: owner.y, vx: Math.cos(owner.turret) * owner.shellSpeed, vy: Math.sin(owner.turret) * owner.shellSpeed, life: 1.8})
    }

    function moveShells(delta) {
        shells.forEach(function move(shell) {
            shell.x += shell.vx * delta
            shell.y += shell.vy * delta
            shell.life -= delta
            const target = findShellTarget(shell)
            if (target) damageTarget(target)
            if (shell.x < 0 || shell.y < 0 || shell.x > arena.size || shell.y > arena.size) shell.life = 0
        })
    }

    function moveEnemies({delta, now}) {
        enemies.filter(alive).forEach(function chase(enemy) {
            const angle = Math.atan2(player.y - enemy.y, player.x - enemy.x)
            enemy.heading = angle
            enemy.turret = angle
            if (distance(enemy, player) > 4) moveEnemy(enemy, Math.cos(angle) * enemy.speed * delta, Math.sin(angle) * enemy.speed * delta)
        })
        if (now - lastEnemyShotAt > 900) {
            const shooter = enemies.find(function inRange(enemy) { return enemy.alive && distance(enemy, player) < 14 })
            if (shooter) {
                shoot(shooter)
                lastEnemyShotAt = now
            }
        }
    }

    function moveEnemy(enemy, dx, dy) {
        const x = Math.max(.5, Math.min(arena.size - 1.5, enemy.x + dx))
        const y = Math.max(.5, Math.min(arena.size - 1.5, enemy.y + dy))
        if (!blocks.some(function blocked(block) { return block.alive && Math.hypot(block.x - x, block.y - y) < .75 })) {
            enemy.x = x
            enemy.y = y
        }
    }

    function findShellTarget(shell) {
        const block = blocks.find(function hit(candidate) { return candidate.alive && distance(shell, candidate) < .55 })
        if (block) return block
        const targets = shell.owner == player ? enemies : [player]
        return targets.find(function hit(candidate) { return candidate.alive && distance(shell, candidate) < .55 })
    }

    function damageTarget(target) {
        target.hp -= 1
        effects.push({x: target.x, y: target.y, life: .42, color: target.hp < 1 ? '#fff0a6' : '#ffd08a'})
        if (target.hp < 1) target.alive = false
    }

    function removeExpired() {
        while (shells.length && shells[0].life <= 0) shells.shift()
        while (effects.length && effects[0].life <= 0) effects.shift()
    }

    return {
        api: {
            snapshot: function snapshot() { return {arena, player, enemies, shells, effects, cores: [], blocks} },
            status: function status() {
                return {
                    mapKind: arena.kind,
                    objects: blocks.filter(alive).length,
                    destroyed: blocks.filter(function destroyed(block) { return !block.alive }).length,
                    enemies: enemies.filter(alive).length,
                    hp: player.hp,
                }
            },
        },
        runtime: {update},
    }
}

function alive(subject) { return subject.alive }
function distance(a, b) { return Math.hypot(a.x - b.x, a.y - b.y) }
