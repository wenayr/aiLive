const canvas = document.querySelector('#game')
const context = canvas.getContext('2d')
const hud = document.querySelector('#hud')
const mapPicker = document.querySelector('#map')
const keys = new Set()
const mapKey = new URLSearchParams(location.search).get('map') ?? 'crossroads'
const manualMaps = {
    crossroads: [[2, 2], [3, 2], [4, 2], [8, 2], [9, 2], [10, 2], [2, 5], [5, 5], [8, 5], [10, 5], [3, 8], [4, 8], [6, 8], [8, 8], [9, 8], [2, 10], [5, 10], [8, 10], [10, 10]],
    ring: [[3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [3, 4], [9, 4], [3, 5], [9, 5], [3, 6], [9, 6], [3, 7], [9, 7], [3, 8], [9, 8], [3, 9], [4, 9], [5, 9], [6, 9], [7, 9], [8, 9], [9, 9]],
    islands: [[2, 2], [3, 2], [2, 3], [9, 2], [10, 2], [10, 3], [2, 9], [2, 10], [3, 10], [9, 9], [10, 9], [9, 10], [5, 5], [6, 5], [7, 5], [6, 6], [5, 7], [6, 7], [7, 7]],
}
const arena = {size: 13, key: manualMaps[mapKey] ? mapKey : 'crossroads', walls: manualMaps[mapKey] ?? manualMaps.crossroads}
const player = tank('player', 6, 10, '#79e7a9', 1.1)
const enemies = [
    tank('scout', 1, 1, '#ffba69', 1.5), tank('scout', 11, 1, '#ffba69', 1.5),
    tank('brute', 6, 1, '#ef7373', .8), tank('brute', 1, 6, '#ef7373', .8),
    tank('brute', 11, 6, '#ef7373', .8), tank('scout', 1, 11, '#ffba69', 1.5),
    tank('scout', 11, 11, '#ffba69', 1.5), tank('brute', 6, 6, '#ef7373', .8),
    tank('ace', 6, 3, '#a993ff', 1.9),
]
const manualReinforcementSquads = [
    [tank('scout', 2, 1, '#ffba69', 1.7), tank('scout', 10, 1, '#ffba69', 1.7), tank('brute', 6, 2, '#ef7373', .85)],
    [tank('brute', 1, 4, '#ef7373', .85), tank('scout', 11, 4, '#ffba69', 1.7), tank('brute', 6, 7, '#ef7373', .85)],
    [tank('ace', 1, 11, '#a993ff', 2), tank('ace', 11, 11, '#a993ff', 2), tank('brute', 6, 1, '#ef7373', .9)],
]
const shells = []
let lastTime = performance.now()
let lastShotAt = 0
let nextReinforcement = 0
let aim = {x: 6, y: 0}

mapPicker.value = arena.key
mapPicker.addEventListener('change', function changeMap() {
    const url = new URL(location.href)
    url.searchParams.set('map', mapPicker.value)
    location.assign(url)
})

window.addEventListener('keydown', function onKeyDown(event) {
    keys.add(event.key.toLowerCase())
    if (event.code == 'Space') event.preventDefault()
})
window.addEventListener('keyup', function onKeyUp(event) { keys.delete(event.key.toLowerCase()) })
canvas.addEventListener('pointermove', function aimTurret(event) {
    const bounds = canvas.getBoundingClientRect()
    aim = unproject(
        (event.clientX - bounds.left) * canvas.width / bounds.width,
        (event.clientY - bounds.top) * canvas.height / bounds.height,
    )
})

function tank(kind, x, y, color, speed) {
    const model = kind == 'ace'
        ? {bodyLength: 42, bodyWidth: 24, trackWidth: 7, turretRadius: 11, barrelLength: 33, shellSpeed: 9}
        : kind == 'brute'
            ? {bodyLength: 38, bodyWidth: 26, trackWidth: 8, turretRadius: 12, barrelLength: 28, shellSpeed: 6}
            : {bodyLength: 32, bodyWidth: 20, trackWidth: 6, turretRadius: 9, barrelLength: 25, shellSpeed: 7}
    return {kind, x, y, color, speed, heading: -Math.PI / 2, turret: -Math.PI / 2, hp: kind == 'brute' ? 3 : 1, alive: true, model}
}

function frame(now) {
    const delta = Math.min((now - lastTime) / 1000, .04)
    lastTime = now
    update(delta, now)
    draw()
    requestAnimationFrame(frame)
}

function update(delta, now) {
    if (keys.has('a')) player.heading -= delta * 2.5
    if (keys.has('d')) player.heading += delta * 2.5
    if (keys.has('q')) player.turret -= delta * 3
    if (keys.has('e')) player.turret += delta * 3
    player.turret = Math.atan2(aim.y - player.y, aim.x - player.x)
    const direction = (keys.has('w') ? 1 : 0) - (keys.has('s') ? 1 : 0)
    moveTank(player, Math.cos(player.heading) * direction * delta * 3.2, Math.sin(player.heading) * direction * delta * 3.2)
    if (keys.has(' ') && now - lastShotAt > 360) {
        shoot(player)
        lastShotAt = now
    }
    for (const enemy of enemies.filter(function alive(enemy) { return enemy.alive })) {
        const angle = Math.atan2(player.y - enemy.y, player.x - enemy.x)
        enemy.heading = angle
        enemy.turret = angle
        if (distance(enemy, player) > 3.5) moveTank(enemy, Math.cos(angle) * enemy.speed * delta * .55, Math.sin(angle) * enemy.speed * delta * .55)
        if (Math.random() < delta * .34) shoot(enemy)
    }
    for (const shell of shells) {
        shell.x += shell.vx * delta
        shell.y += shell.vy * delta
        shell.life -= delta
        if (arena.walls.some(function blocked(wall) { return Math.hypot(shell.x - wall[0] - .5, shell.y - wall[1] - .5) < .55 })) shell.life = 0
        const victim = shell.owner == player ? enemies.find(function hit(enemy) { return enemy.alive && distance(shell, enemy) < .5 }) : player
        if (victim?.alive && shell.owner != victim && distance(shell, victim) < .5) {
            victim.hp -= 1
            if (victim.hp < 1) victim.alive = false
            shell.life = 0
        }
    }
    while (shells.length && shells[0].life <= 0) shells.shift()
    if (player.alive && !enemies.some(function alive(enemy) { return enemy.alive }) && nextReinforcement < manualReinforcementSquads.length) {
        enemies.push(...manualReinforcementSquads[nextReinforcement])
        nextReinforcement += 1
    }
    hud.textContent = player.alive
        ? `Hull ${player.hp} · hostile tanks ${enemies.filter(function alive(enemy) { return enemy.alive }).length} · ${arena.key} · manual squad ${nextReinforcement}/3 · manual layout: ${arena.walls.length} walls`
        : 'Your tank was destroyed. Reload the page to restart.'
}

function moveTank(subject, dx, dy) {
    const x = Math.max(.5, Math.min(arena.size - 1.5, subject.x + dx))
    const y = Math.max(.5, Math.min(arena.size - 1.5, subject.y + dy))
    if (!arena.walls.some(function occupied(wall) { return Math.hypot(wall[0] - x, wall[1] - y) < .75 })) {
        subject.x = x
        subject.y = y
    }
}

function shoot(owner) {
    if (!owner.alive) return
    shells.push({owner, x: owner.x, y: owner.y, vx: Math.cos(owner.turret) * owner.model.shellSpeed, vy: Math.sin(owner.turret) * owner.model.shellSpeed, life: 1.4})
}

function draw() {
    context.clearRect(0, 0, canvas.width, canvas.height)
    context.fillStyle = '#0a1711'
    context.fillRect(0, 0, canvas.width, canvas.height)
    for (let y = 0; y < arena.size; y += 1) for (let x = 0; x < arena.size; x += 1) drawTile(x, y)
    arena.walls.forEach(function wall(item) { drawBlock(item[0], item[1], '#406a4d') })
    shells.forEach(function shell(item) { drawOrb(item.x, item.y) })
    ;[...enemies, player].filter(function alive(item) { return item.alive }).sort(function depth(a, b) { return a.x + a.y - b.x - b.y }).forEach(drawTank)
}

function project(x, y, z = 0) { return [480 + (x - y) * 30, 84 + (x + y) * 15 - z * 30] }
function unproject(screenX, screenY) {
    const difference = (screenX - 480) / 30
    const sum = (screenY - 84) / 15
    return {x: (sum + difference) / 2, y: (sum - difference) / 2}
}
function diamond(x, y, z, color) {
    const points = [[x, y], [x + 1, y], [x + 1, y + 1], [x, y + 1]].map(function point(item) { return project(item[0], item[1], z) })
    context.fillStyle = color
    context.beginPath()
    points.forEach(function point(item, index) { index ? context.lineTo(...item) : context.moveTo(...item) })
    context.closePath()
    context.fill()
}
function drawTile(x, y) { diamond(x, y, 0, (x + y) % 2 ? '#1a3b2a' : '#1d4631') }
function drawBlock(x, y, color) { diamond(x, y, .65, color); diamond(x, y, .02, '#274632') }
function drawOrb(x, y) { const [sx, sy] = project(x, y, .45); context.fillStyle = '#fff0a2'; context.beginPath(); context.arc(sx, sy, 5, 0, Math.PI * 2); context.fill() }
function drawTank(subject) {
    const {model} = subject
    const [x, y] = project(subject.x, subject.y, .15)
    context.save()
    context.translate(x, y)
    context.rotate(subject.heading + Math.PI / 4)
    context.fillStyle = '#0008'; context.fillRect(-model.bodyLength / 2, 9, model.bodyLength, model.trackWidth + 3)
    context.fillStyle = '#163121'; context.fillRect(-model.bodyLength / 2, -model.bodyWidth / 2 - 2, model.bodyLength, model.trackWidth)
    context.fillRect(-model.bodyLength / 2, model.bodyWidth / 2 - model.trackWidth + 2, model.bodyLength, model.trackWidth)
    context.fillStyle = subject.color; context.fillRect(-model.bodyLength / 2 + 2, -model.bodyWidth / 2, model.bodyLength - 4, model.bodyWidth)
    context.rotate(subject.turret - subject.heading)
    context.fillStyle = '#e8f7ed'; context.fillRect(-3, -model.barrelLength, 6, model.barrelLength)
    context.fillStyle = subject.color; context.beginPath(); context.arc(0, 0, model.turretRadius, 0, Math.PI * 2); context.fill()
    context.restore()
}
function distance(a, b) { return Math.hypot(a.x - b.x, a.y - b.y) }

requestAnimationFrame(frame)
