const canvas = document.querySelector('#game')
const context = canvas.getContext('2d')
const hud = document.querySelector('#hud')
const mapPicker = document.querySelector('#map')
const key = new URLSearchParams(location.search).get('map') ?? 'canyon'
const maps = {
    crossroads: palette('#101b17', '#214835', '#2a5a41', '#77b678'), ring: palette('#211116', '#58242e', '#6e2e3c', '#c45e70'), islands: palette('#0a1930', '#173c62', '#1e4e7c', '#4e9cd0'), zigzag: palette('#29102a', '#592758', '#72336f', '#d45bcb'), orchard: palette('#102310', '#274e26', '#326535', '#9dce73'), turbine: palette('#16151f', '#383647', '#4b485c', '#b7a4d9'), canyon: palette('#27190d', '#654123', '#7d512d', '#dfa05a'), delta: palette('#071f23', '#16515a', '#1e6872', '#61d1ce'), crater: palette('#211011', '#55262a', '#703337', '#e36e62'), shards: palette('#16132a', '#393161', '#4a3e7d', '#aa93ff'),
}
const arena = {size: 130, key: maps[key] ? key : 'canyon', ...maps[key] ?? maps.canyon}
const player = tank('player', 12, 12, '#8ff0c0', 4, 3.3, 8)
const enemies = [tank('scout', 19, 12, '#ffcb7a', 1, 1.7, 7), tank('brute', 12, 20, '#f3788f', 3, .8, 6), tank('artillery', 21, 21, '#7fe5e1', 2, 1.1, 11)]
const blocks = makeBlocks()
const outpost = [
    {x: 8, y: 5, width: 1.4, length: 1.2, height: 3.8, color: '#34456f'},
    {x: 15, y: 7, width: 2.2, length: 1, height: 2.2, color: '#3e577e'},
    {x: 22, y: 5, width: 1.1, length: 1.1, height: 5.2, color: '#2f3d68'},
    {x: 28, y: 11, width: 2.6, length: 1.3, height: 2.6, color: '#415b7c'},
    {x: 7, y: 17, width: 1.5, length: 1.5, height: 4.4, color: '#354a72'},
    {x: 19, y: 18, width: 3.2, length: 1.1, height: 1.8, color: '#45627d'},
]
const keys = new Set()
const shells = []
const effects = []
let last = performance.now()
let lastShot = 0
let lastEnemyShot = 0
let paused = false
let turretAngle = player.heading

mapPicker.value = arena.key
mapPicker.addEventListener('change', function changeMap() { const url = new URL(location.href); url.searchParams.set('map', mapPicker.value); location.assign(url) })
window.addEventListener('keydown', function keyDown(event) { keys.add(event.key.toLowerCase()); if (event.code == 'Space') event.preventDefault(); if (!event.repeat && event.key.toLowerCase() == 'p') paused = !paused; if (!event.repeat && event.key.toLowerCase() == 'r') location.reload() })
window.addEventListener('keyup', function keyUp(event) { keys.delete(event.key.toLowerCase()) })
canvas.addEventListener('pointermove', function aim(event) { const bounds = canvas.getBoundingClientRect(); turretAngle = player.heading + ((event.clientX - bounds.left) / bounds.width - .5) * 1.8 })

function palette(background, tileA, tileB, wall) { return {background, tileA, tileB, wall} }
function tank(kind, x, y, color, hp, speed, shellSpeed) { return {kind, x, y, color, hp, speed, shellSpeed, heading: -Math.PI / 2, turret: -Math.PI / 2, alive: true} }
function makeBlocks() {
    const blocks = []
    for (let row = 0; row < 9; row += 1) for (let column = 0; column < 9; column += 1) {
        const x = 4 + column * 4 + (row % 2) * 1.5
        const y = 4 + row * 4
        if (Math.hypot(x - player.x, y - player.y) > 4) blocks.push({x, y, hp: (row + column) % 4 == 0 ? 2 : 1, alive: true})
    }
    return blocks
}

function frame(now) {
    const delta = Math.min((now - last) / 1000, .04)
    last = now
    if (!paused) update(delta, now)
    draw()
    hud.textContent = `${paused ? 'PAUSED · ' : ''}${arena.key} · night outpost 3D · hull ${player.hp} · enemies ${enemies.filter(alive).length} · objects ${blocks.filter(alive).length} · destroyed ${blocks.filter(dead).length}`
    requestAnimationFrame(frame)
}
function update(delta, now) {
    if (keys.has('a')) player.heading -= delta * 2.6
    if (keys.has('d')) player.heading += delta * 2.6
    player.turret = turretAngle
    const direction = (keys.has('w') ? 1 : 0) - (keys.has('s') ? 1 : 0)
    move(player, Math.cos(player.heading) * direction * delta * player.speed, Math.sin(player.heading) * direction * delta * player.speed)
    if (keys.has(' ') && now - lastShot > 260) { shoot(player); lastShot = now }
    enemies.filter(alive).forEach(function chase(enemy) { const angle = Math.atan2(player.y - enemy.y, player.x - enemy.x); enemy.heading = angle; enemy.turret = angle; if (distance(enemy, player) > 4) move(enemy, Math.cos(angle) * enemy.speed * delta, Math.sin(angle) * enemy.speed * delta) })
    if (now - lastEnemyShot > 900) { const shooter = enemies.find(function close(enemy) { return enemy.alive && distance(enemy, player) < 14 }); if (shooter) { shoot(shooter); lastEnemyShot = now } }
    shells.forEach(function shell(shell) { shell.x += shell.vx * delta; shell.y += shell.vy * delta; shell.life -= delta; const target = targetFor(shell); if (target) damage(target) })
    effects.forEach(function effect(effect) { effect.life -= delta })
    removeExpired(shells); removeExpired(effects)
}
function move(subject, dx, dy) { const x = Math.max(.5, Math.min(arena.size - 1.5, subject.x + dx)); const y = Math.max(.5, Math.min(arena.size - 1.5, subject.y + dy)); if (!blocks.some(function blocked(block) { return block.alive && Math.hypot(block.x - x, block.y - y) < .72 })) { subject.x = x; subject.y = y } }
function shoot(owner) { shells.push({owner, x: owner.x, y: owner.y, vx: Math.cos(owner.turret) * owner.shellSpeed, vy: Math.sin(owner.turret) * owner.shellSpeed, life: 1.8}) }
function targetFor(shell) { const block = blocks.find(function hit(block) { return block.alive && distance(shell, block) < .55 }); if (block) return block; return (shell.owner == player ? enemies : [player]).find(function hit(subject) { return subject.alive && distance(shell, subject) < .55 }) }
function damage(target) { target.hp -= 1; effects.push({x: target.x, y: target.y, life: .42, color: target.hp < 1 ? '#fff0a6' : '#ffd08a'}); if (target.hp < 1) target.alive = false }
function removeExpired(items) { while (items.length && items[0].life <= 0) items.shift() }

function draw() {
    const sky = context.createLinearGradient(0, 0, 0, canvas.height)
    sky.addColorStop(0, '#080b1b')
    sky.addColorStop(1, arena.background)
    context.fillStyle = sky
    context.fillRect(0, 0, canvas.width, canvas.height)
    const camera = {x: player.x - Math.cos(player.heading) * 5.2, y: player.y - Math.sin(player.heading) * 5.2, z: 4.6, heading: player.heading, focal: 520, horizon: 235}
    const polygons = []
    for (let y = Math.floor(camera.y) - 16; y <= Math.floor(camera.y) + 16; y += 1) for (let x = Math.floor(camera.x) - 16; x <= Math.floor(camera.x) + 16; x += 1) if (x >= 0 && y >= 0 && x < arena.size && y < arena.size) polygon(polygons, camera, [[x, y, 0], [x + 1, y, 0], [x + 1, y + 1, 0], [x, y + 1, 0]], (x + y) % 2 ? arena.tileA : arena.tileB)
    blocks.filter(function near(block) { return block.alive && distance(block, player) < 22 }).forEach(function block(block) { box(polygons, camera, block.x, block.y, .8, .9, .9, block.hp > 1 ? 1.6 : 1.05, 0, block.hp > 1 ? '#f5c978' : arena.wall) })
    outpost.filter(function near(building) { return distance(building, player) < 30 }).forEach(function building(building) { drawBuilding(polygons, camera, building) })
    enemies.filter(function near(enemy) { return enemy.alive && distance(enemy, player) < 26 }).forEach(function enemy(enemy) { model(polygons, camera, enemy) })
    model(polygons, camera, player)
    shells.forEach(function shell(shell) { const point = project(shell.x, shell.y, .7, camera); if (point) polygons.push({depth: point.depth, color: '#fff1a3', points: [[point.x - 4, point.y], [point.x, point.y - 4], [point.x + 4, point.y], [point.x, point.y + 4]]}) })
    effects.forEach(function effect(effect) { const point = project(effect.x, effect.y, .6, camera); if (point) polygons.push({depth: point.depth, color: effect.color, alpha: effect.life * 2, points: [[point.x - 12, point.y], [point.x, point.y - 12], [point.x + 12, point.y], [point.x, point.y + 12]]}) })
    polygons.sort(function depth(a, b) { return b.depth - a.depth }).forEach(paint)
    context.strokeStyle = '#ffffffaa'; context.beginPath(); context.arc(480, 320, 8, 0, Math.PI * 2); context.moveTo(466, 320); context.lineTo(494, 320); context.stroke()
}
function model(polygons, camera, subject) { const scale = subject.kind == 'brute' ? 1.22 : subject.kind == 'scout' ? .82 : 1; box(polygons, camera, subject.x, subject.y, .36, .82 * scale, 1.22 * scale, .48 * scale, subject.heading, subject.color); box(polygons, camera, subject.x, subject.y, .82 * scale, .55 * scale, .55 * scale, .35 * scale, subject.turret, shade(subject.color, 18)); const nose = ahead(subject, .56 * scale); box(polygons, camera, nose.x, nose.y, scale, .14 * scale, subject.kind == 'artillery' ? 1.15 : .82, .14 * scale, subject.turret, '#eef8ff') }
function drawBuilding(polygons, camera, building) { box(polygons, camera, building.x, building.y, building.height / 2, building.width, building.length, building.height, 0, building.color); box(polygons, camera, building.x, building.y, building.height + .08, building.width * .52, building.length * .52, .16, 0, '#ffcc75') }
function box(polygons, camera, x, y, z, width, length, height, heading, color) { const corners = cornersFor(x, y, width, length, heading); const bottom = corners.map(function point(point) { return [...point, z - height / 2] }); const top = corners.map(function point(point) { return [...point, z + height / 2] }); polygon(polygons, camera, top, shade(color, 20)); polygon(polygons, camera, [bottom[0], bottom[1], top[1], top[0]], shade(color, -18)); polygon(polygons, camera, [bottom[1], bottom[2], top[2], top[1]], color); polygon(polygons, camera, [bottom[2], bottom[3], top[3], top[2]], shade(color, -8)); polygon(polygons, camera, [bottom[3], bottom[0], top[0], top[3]], color) }
function polygon(polygons, camera, points, color) { const projected = points.map(function point(point) { return project(point[0], point[1], point[2], camera) }); if (projected.some(function hidden(point) { return !point })) return; polygons.push({depth: projected.reduce(function sum(total, point) { return total + point.depth }, 0) / projected.length, color, points: projected}) }
function project(x, y, z, camera) { const dx = x - camera.x; const dy = y - camera.y; const forward = dx * Math.cos(camera.heading) + dy * Math.sin(camera.heading); if (forward < .25) return null; const right = -dx * Math.sin(camera.heading) + dy * Math.cos(camera.heading); return {x: 480 + right * camera.focal / forward, y: camera.horizon + (camera.z - z) * camera.focal / forward, depth: forward} }
function paint(item) { context.globalAlpha = item.alpha ?? 1; context.fillStyle = item.color; context.beginPath(); item.points.forEach(function point(point, index) { index ? context.lineTo(point.x ?? point[0], point.y ?? point[1]) : context.moveTo(point.x ?? point[0], point.y ?? point[1]) }); context.closePath(); context.fill(); context.globalAlpha = 1 }
function cornersFor(x, y, width, length, heading) { const forward = {x: Math.cos(heading) * length / 2, y: Math.sin(heading) * length / 2}; const right = {x: -Math.sin(heading) * width / 2, y: Math.cos(heading) * width / 2}; return [[x - forward.x - right.x, y - forward.y - right.y], [x + forward.x - right.x, y + forward.y - right.y], [x + forward.x + right.x, y + forward.y + right.y], [x - forward.x + right.x, y - forward.y + right.y]] }
function ahead(subject, amount) { return {x: subject.x + Math.cos(subject.turret) * amount, y: subject.y + Math.sin(subject.turret) * amount} }
function shade(color, amount) { const number = Number.parseInt(color.slice(1), 16); const part = function part(offset) { return Math.max(0, Math.min(255, (number >> offset & 255) + amount)).toString(16).padStart(2, '0') }; return `#${part(16)}${part(8)}${part(0)}` }
function alive(subject) { return subject.alive }
function dead(subject) { return !subject.alive }
function distance(a, b) { return Math.hypot(a.x - b.x, a.y - b.y) }
requestAnimationFrame(frame)
