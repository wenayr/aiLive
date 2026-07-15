import { createTank } from '../generators/create-tank.mjs'
import { createCoastalWorld } from '../generators/create-coastal-world.mjs'

export function createCoastalScenario({seed = 'tideline'} = {}) {
    const world = createCoastalWorld({seed})
    const player = createTank({id: 'coastal-player', archetype: 'player', x: 12, y: 18, heading: 0})
    const enemies = [createTank({id: 'coastal-scout', archetype: 'scout', x: 19, y: 22}), createTank({id: 'coastal-brute', archetype: 'brute', x: 29, y: 25}), createTank({id: 'coastal-artillery', archetype: 'artillery', x: 24, y: 34})]
    const shells = []
    const effects = []
    let lastShotAt = 0
    let lastEnemyShotAt = 0

    function update({delta, now, input}) {
        if (input.left) player.heading -= delta * 2.45
        if (input.right) player.heading += delta * 2.45
        if (input.aim) player.turret = Math.atan2(input.aim.y - player.y, input.aim.x - player.x)
        const direction = (input.forward ? 1 : 0) - (input.backward ? 1 : 0)
        moveTank(player, Math.cos(player.heading) * direction * player.speed * delta, Math.sin(player.heading) * direction * player.speed * delta)
        if (input.fire && now - lastShotAt > 250) { fire(player); lastShotAt = now }
        enemies.filter(alive).forEach(function chase(enemy) {
            const angle = Math.atan2(player.y - enemy.y, player.x - enemy.x)
            enemy.heading = angle
            enemy.turret = angle
            if (distance(enemy, player) > 5) moveTank(enemy, Math.cos(angle) * enemy.speed * delta, Math.sin(angle) * enemy.speed * delta)
        })
        if (now - lastEnemyShotAt > 950) {
            const enemy = enemies.find(function inRange(item) { return item.alive && distance(item, player) < 16 })
            if (enemy) { fire(enemy); lastEnemyShotAt = now }
        }
        shells.forEach(function travel(shell) {
            shell.x += shell.vx * delta
            shell.y += shell.vy * delta
            shell.life -= delta
            const target = hitTarget(shell)
            if (target) damage(target, shell)
        })
        removeExpired(delta)
    }

    function moveTank(tank, dx, dy) {
        const x = Math.max(2, Math.min(world.size - 2, tank.x + dx))
        const y = Math.max(world.size * .2 + 3, Math.min(world.size - 2, tank.y + dy))
        if (!world.isSea(x, y)) { tank.x = x; tank.y = y }
    }
    function fire(owner) { shells.push({owner, x: owner.x, y: owner.y, vx: Math.cos(owner.turret) * owner.shellSpeed, vy: Math.sin(owner.turret) * owner.shellSpeed, life: 1.8}) }
    function hitTarget(shell) {
        const scenery = [...world.cover, ...world.flora].find(function hit(item) { return item.alive && distance(shell, item) < .55 })
        if (scenery) return scenery
        return (shell.owner == player ? enemies : [player]).find(function hit(tank) { return tank.alive && distance(shell, tank) < .58 })
    }
    function damage(target, shell) {
        target.hp -= 1
        target.alive = target.hp > 0
        shell.life = 0
        effects.push({x: target.x, y: target.y, life: .42, color: target.alive ? '#f6ca75' : '#fff1b1'})
    }
    function removeExpired(delta) {
        effects.forEach(function fade(effect) { effect.life -= delta })
        for (let index = shells.length - 1; index >= 0; index -= 1) if (shells[index].life <= 0) shells.splice(index, 1)
        for (let index = effects.length - 1; index >= 0; index -= 1) if (effects[index].life <= 0) effects.splice(index, 1)
    }
    return {api: {snapshot: function snapshot() { return {world, player, enemies, shells, effects} }, status: function status() { return {hp: player.hp, enemies: enemies.filter(alive).length, cover: [...world.cover, ...world.flora].filter(alive).length} }}, runtime: {update}}
}
function alive(subject) { return subject.alive }
function distance(a, b) { return Math.hypot(a.x - b.x, a.y - b.y) }
