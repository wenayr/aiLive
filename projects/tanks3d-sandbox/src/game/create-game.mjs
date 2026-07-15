import { createArena } from '../generators/create-arena.mjs'
import { createTank } from '../generators/create-tank.mjs'
import { createWave } from '../generators/create-wave.mjs'

export function createGame({seed = 'violet-arena'} = {}) {
    const arena = createArena({seed})
    const player = createTank({id: 'player', archetype: 'player', x: 6, y: 10})
    let round = 1
    const enemies = createWave({round, spawnPads: arena.spawnPads})
    const shells = []
    let lastShotAt = 0

    function update({delta, now, input}) {
        rotatePlayer(delta, input)
        movePlayer(delta, input)
        if (input.fire && now - lastShotAt > 340) {
            shoot(player)
            lastShotAt = now
        }
        enemies.filter(alive).forEach(function moveEnemy(enemy) {
            const angle = Math.atan2(player.y - enemy.y, player.x - enemy.x)
            enemy.heading = angle
            enemy.turret = angle
            if (distance(enemy, player) > 3.3) move(enemy, Math.cos(angle) * enemy.speed * delta * .6, Math.sin(angle) * enemy.speed * delta * .6)
            if (Math.random() < delta * .3) shoot(enemy)
        })
        shells.forEach(function moveShell(shell) {
            shell.x += shell.vx * delta
            shell.y += shell.vy * delta
            shell.life -= delta
            const victim = shell.owner == player
                ? enemies.find(function hit(enemy) { return enemy.alive && distance(shell, enemy) < .5 })
                : player
            if (victim?.alive && shell.owner != victim && distance(shell, victim) < .5) {
                victim.hp -= 1
                if (victim.hp < 1) victim.alive = false
                shell.life = 0
            }
        })
        while (shells.length && shells[0].life <= 0) shells.shift()
        if (player.alive && !enemies.some(alive)) startNextWave()
    }

    function rotatePlayer(delta, input) {
        if (input.left) player.heading -= delta * 2.5
        if (input.right) player.heading += delta * 2.5
        if (input.turretLeft) player.turret -= delta * 3
        if (input.turretRight) player.turret += delta * 3
    }

    function movePlayer(delta, input) {
        const direction = (input.forward ? 1 : 0) - (input.backward ? 1 : 0)
        move(player, Math.cos(player.heading) * direction * delta * player.speed, Math.sin(player.heading) * direction * delta * player.speed)
    }

    function move(subject, dx, dy) {
        const x = Math.max(.5, Math.min(arena.size - 1.5, subject.x + dx))
        const y = Math.max(.5, Math.min(arena.size - 1.5, subject.y + dy))
        if (!arena.walls.some(function occupied(wall) { return Math.hypot(wall[0] - x, wall[1] - y) < .75 })) {
            subject.x = x
            subject.y = y
        }
    }

    function shoot(owner) {
        if (!owner.alive) return
        shells.push({owner, x: owner.x, y: owner.y, vx: Math.cos(owner.turret) * 7, vy: Math.sin(owner.turret) * 7, life: 1.4})
    }

    function startNextWave() {
        round += 1
        enemies.push(...createWave({round, spawnPads: arena.spawnPads}))
    }

    return {
        api: {
            snapshot: function snapshot() { return {arena, player, enemies, shells} },
            status: function status() {
                return {hp: player.hp, enemies: enemies.filter(alive).length, round, playerAlive: player.alive}
            },
        },
        runtime: {update},
    }
}

function alive(subject) { return subject.alive }
function distance(a, b) { return Math.hypot(a.x - b.x, a.y - b.y) }
