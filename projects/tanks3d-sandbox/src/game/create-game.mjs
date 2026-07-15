import { createArena } from '../generators/create-arena.mjs'
import { createTank } from '../generators/create-tank.mjs'
import { createWave } from '../generators/create-wave.mjs'

export function createGame({seed = 'violet-arena', mapKind = 'crossroads'} = {}) {
    const arena = createArena({seed, kind: mapKind})
    const player = createTank({id: 'player', archetype: 'player', x: 6, y: 10})
    let round = 1
    const enemies = createWave({round, spawnPads: arena.spawnPads})
    const shells = []
    const cores = arena.corePads.map(function createCore(pad, index) {
        return {id: `core-${index + 1}`, x: pad[0] + .5, y: pad[1] + .5, collected: false}
    })
    let lastShotAt = 0
    let boostCharges = 0
    let boostUntil = 0
    let boostHeld = false

    function update({delta, now, input}) {
        rotatePlayer(delta, input)
        collectCores()
        activateBoost({now, input})
        movePlayer(delta, now, input)
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
            if (arena.walls.some(function blocked(wall) { return Math.hypot(shell.x - wall[0] - .5, shell.y - wall[1] - .5) < .55 })) shell.life = 0
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
        if (input.aim) player.turret = Math.atan2(input.aim.y - player.y, input.aim.x - player.x)
    }

    function movePlayer(delta, now, input) {
        const direction = (input.forward ? 1 : 0) - (input.backward ? 1 : 0)
        const speed = now < boostUntil ? player.speed * 1.8 : player.speed
        move(player, Math.cos(player.heading) * direction * delta * speed, Math.sin(player.heading) * direction * delta * speed)
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
        shells.push({owner, x: owner.x, y: owner.y, vx: Math.cos(owner.turret) * owner.shellSpeed, vy: Math.sin(owner.turret) * owner.shellSpeed, life: 1.4})
    }

    function startNextWave() {
        round += 1
        enemies.push(...createWave({round, spawnPads: arena.spawnPads}))
    }

    function collectCores() {
        cores.filter(function available(core) { return !core.collected }).forEach(function collect(core) {
            if (distance(player, core) < .65) {
                core.collected = true
                boostCharges += 1
            }
        })
    }

    function activateBoost({now, input}) {
        if (input.boost && !boostHeld && boostCharges > 0) {
            boostCharges -= 1
            boostUntil = now + 680
        }
        boostHeld = Boolean(input.boost)
    }

    return {
        api: {
            snapshot: function snapshot() { return {arena, player, enemies, shells, cores, boostUntil} },
            status: function status() {
                return {
                    hp: player.hp,
                    enemies: enemies.filter(alive).length,
                    round,
                    mapKind: arena.kind,
                    cores: cores.filter(function collected(core) { return core.collected }).length,
                    coreTotal: cores.length,
                    boostCharges,
                    boostActive: boostUntil > 0,
                    playerAlive: player.alive,
                }
            },
        },
        runtime: {update},
    }
}

function alive(subject) { return subject.alive }
function distance(a, b) { return Math.hypot(a.x - b.x, a.y - b.y) }
