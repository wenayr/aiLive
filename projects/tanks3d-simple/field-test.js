const canvas = document.querySelector('#game')
const context = canvas.getContext('2d')
const hud = document.querySelector('#hud')
const mapPicker = document.querySelector('#map')
const keys = new Set()
const mapKey = new URLSearchParams(location.search).get('map') ?? 'crossroads'
const manualMaps = {
    crossroads: map('#101b17', '#214835', '#2a5a41', '#77b678', [[3, 4], [6, 4, 2], [9, 4], [4, 7], [8, 7], [6, 9]]),
    ring: map('#211116', '#58242e', '#6e2e3c', '#c45e70', [[4, 4], [5, 4], [6, 4], [7, 4], [8, 4], [4, 6, 2], [8, 6, 2], [4, 8], [5, 8], [6, 8], [7, 8], [8, 8]]),
    islands: map('#0a1930', '#173c62', '#1e4e7c', '#4e9cd0', [[3, 3, 2], [4, 3], [8, 3], [9, 3, 2], [3, 8], [4, 9, 2], [8, 9, 2], [9, 8]]),
    zigzag: map('#29102a', '#592758', '#72336f', '#d45bcb', [[3, 3], [5, 4, 2], [7, 5], [9, 6], [7, 7], [5, 8, 2], [3, 9], [9, 3]]),
    orchard: map('#102310', '#274e26', '#326535', '#9dce73', [[3, 3], [6, 3, 2], [9, 3], [3, 6, 2], [9, 6, 2], [3, 9], [6, 9], [9, 9, 2]]),
    turbine: map('#16151f', '#383647', '#4b485c', '#b7a4d9', [[6, 3, 2], [6, 4], [4, 6], [5, 6], [7, 6], [8, 6], [6, 8], [6, 9, 2], [4, 4], [8, 8]]),
    canyon: map('#27190d', '#654123', '#7d512d', '#dfa05a', [[3, 3], [4, 4], [3, 5, 2], [4, 6], [3, 7], [9, 3, 2], [8, 4], [9, 5], [8, 6, 2], [9, 7]]),
    delta: map('#071f23', '#16515a', '#1e6872', '#61d1ce', [[6, 3, 2], [6, 4], [5, 5], [7, 5], [4, 6], [8, 6], [3, 7, 2], [9, 7, 2], [2, 8], [10, 8]]),
    crater: map('#211011', '#55262a', '#703337', '#e36e62', [[5, 3], [6, 3], [7, 3], [4, 4, 2], [8, 4, 2], [3, 6], [9, 6], [4, 8], [8, 8], [5, 9], [6, 9], [7, 9]]),
    shards: map('#16132a', '#393161', '#4a3e7d', '#aa93ff', [[3, 3], [7, 3, 2], [9, 4], [5, 5], [8, 6, 2], [3, 7], [6, 8], [9, 9, 2]]),
}
const selectedMap = manualMaps[mapKey] ?? manualMaps.crossroads
const arena = {size: 130, key: manualMaps[mapKey] ? mapKey : 'crossroads', ...selectedMap}
const player = createPlayer()
const blocks = expandBlocks(arena.blocks).map(function block(item, index) { return {id: `block-${index + 1}`, x: item[0] + .5, y: item[1] + .5, hp: item[2] ?? 1, alive: true} })
const enemies = [createEnemy('scout', 19, 12, '#ffcb7a', 1.7, 1, 7), createEnemy('brute', 12, 20, '#f3788f', .8, 3, 6), createEnemy('artillery', 21, 21, '#7fe5e1', 1.1, 2, 11)]
const shells = []
const effects = []
let aim = {x: 6, y: 0}
let lastShotAt = 0
let lastTime = performance.now()
let paused = false
const camera = {x: player.x, y: player.y}
let lastEnemyShotAt = 0

mapPicker.value = arena.key
mapPicker.addEventListener('change', function changeMap() {
    const url = new URL(location.href)
    url.searchParams.set('map', mapPicker.value)
    location.assign(url)
})
window.addEventListener('keydown', function keyDown(event) {
    keys.add(event.key.toLowerCase())
    if (event.code == 'Space') event.preventDefault()
    if (!event.repeat && event.key.toLowerCase() == 'p') paused = !paused
    if (!event.repeat && event.key.toLowerCase() == 'r') location.reload()
})
window.addEventListener('keyup', function keyUp(event) { keys.delete(event.key.toLowerCase()) })
canvas.addEventListener('pointermove', function aimTurret(event) {
    const bounds = canvas.getBoundingClientRect()
    aim = unproject((event.clientX - bounds.left) * canvas.width / bounds.width, (event.clientY - bounds.top) * canvas.height / bounds.height)
})

function map(background, tileA, tileB, block, blocks) { return {palette: {background, tileA, tileB, block}, blocks} }
function createPlayer() { return {x: 12, y: 12, heading: -Math.PI / 2, turret: -Math.PI / 2, speed: 3.3, shellSpeed: 8, hp: 4, alive: true, color: '#8ff0c0', model: {bodyLength: 38, bodyWidth: 22, trackWidth: 7, turretRadius: 10, barrelLength: 30}} }
function createEnemy(kind, x, y, color, speed, hp, shellSpeed) { return {kind, x, y, color, speed, hp, shellSpeed, heading: -Math.PI / 2, turret: -Math.PI / 2, alive: true, model: {bodyLength: kind == 'brute' ? 42 : 34, bodyWidth: kind == 'brute' ? 26 : 20, trackWidth: 6, turretRadius: 9, barrelLength: kind == 'artillery' ? 42 : 28}} }
function expandBlocks(motif) {
    return motif.flatMap(function repeat(cell) {
        const blocks = []
        for (let row = 0; row < 10; row += 1) for (let column = 0; column < 10; column += 1) blocks.push([cell[0] + column * 12, cell[1] + row * 12, cell[2]])
        return blocks
    }).filter(function safe(cell) { return Math.hypot(cell[0] + .5 - player.x, cell[1] + .5 - player.y) > 3 })
}

function frame(now) {
    const delta = Math.min((now - lastTime) / 1000, .04)
    lastTime = now
    if (!paused) update(delta, now)
    camera.x += (player.x - camera.x) * Math.min(delta * 8, 1)
    camera.y += (player.y - camera.y) * Math.min(delta * 8, 1)
    draw()
    hud.textContent = `${paused ? 'PAUSED · ' : ''}${arena.key} · 130×130 · hull ${player.hp} · enemies ${enemies.filter(alive).length} · objects ${blocks.filter(alive).length} · destroyed ${blocks.filter(destroyed).length}`
    requestAnimationFrame(frame)
}

function update(delta, now) {
    if (keys.has('a')) player.heading -= delta * 2.6
    if (keys.has('d')) player.heading += delta * 2.6
    player.turret = Math.atan2(aim.y - player.y, aim.x - player.x)
    const direction = (keys.has('w') ? 1 : 0) - (keys.has('s') ? 1 : 0)
    movePlayer(Math.cos(player.heading) * direction * delta * player.speed, Math.sin(player.heading) * direction * delta * player.speed)
    if (keys.has(' ') && now - lastShotAt > 260) {
        shoot(player)
        lastShotAt = now
    }
    shells.forEach(moveShell(delta))
    moveEnemies(delta, now)
    effects.forEach(function fade(effect) { effect.life -= delta })
    while (shells.length && shells[0].life <= 0) shells.shift()
    while (effects.length && effects[0].life <= 0) effects.shift()
}

function shoot(owner) { shells.push({owner, x: owner.x, y: owner.y, vx: Math.cos(owner.turret) * owner.shellSpeed, vy: Math.sin(owner.turret) * owner.shellSpeed, life: 1.8}) }
function moveEnemies(delta, now) {
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

function movePlayer(dx, dy) {
    const x = Math.max(.5, Math.min(arena.size - 1.5, player.x + dx))
    const y = Math.max(.5, Math.min(arena.size - 1.5, player.y + dy))
    if (!blocks.some(function blocked(block) { return block.alive && Math.hypot(block.x - x, block.y - y) < .75 })) {
        player.x = x
        player.y = y
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
function moveShell(delta) {
    return function move(shell) {
        shell.x += shell.vx * delta
        shell.y += shell.vy * delta
        shell.life -= delta
        const target = findShellTarget(shell)
        if (target) damageTarget(target)
        if (shell.x < 0 || shell.y < 0 || shell.x > arena.size || shell.y > arena.size) shell.life = 0
    }
}
function findShellTarget(shell) {
    const block = blocks.find(function hit(item) { return item.alive && distance(shell, item) < .55 })
    if (block) return block
    const targets = shell.owner == player ? enemies : [player]
    return targets.find(function hit(item) { return item.alive && distance(shell, item) < .55 })
}
function damageTarget(target) {
    target.hp -= 1
    effects.push({x: target.x, y: target.y, life: .42, color: target.hp < 1 ? '#fff0a6' : '#ffd08a'})
    if (target.hp < 1) target.alive = false
}

function draw() {
    context.clearRect(0, 0, canvas.width, canvas.height)
    context.fillStyle = arena.palette.background
    context.fillRect(0, 0, canvas.width, canvas.height)
    const visible = visibleRange()
    for (let y = visible.startY; y < visible.endY; y += 1) for (let x = visible.startX; x < visible.endX; x += 1) diamond(x, y, 0, (x + y) % 2 ? arena.palette.tileA : arena.palette.tileB)
    blocks.filter(alive).forEach(drawBlock)
    shells.forEach(function shell(item) { drawOrb(item.x, item.y) })
    effects.forEach(drawEffect)
    const subjects = [...enemies, player].filter(alive).sort(function depth(a, b) { return a.x + a.y - b.x - b.y })
    subjects.forEach(drawTank)
}
function visibleRange() { return {startX: Math.max(0, Math.floor(camera.x - 15)), endX: Math.min(arena.size, Math.ceil(camera.x + 15)), startY: Math.max(0, Math.floor(camera.y - 15)), endY: Math.min(arena.size, Math.ceil(camera.y + 15))} }
function project(x, y, z = 0) { return [480 + (x - camera.x - y + camera.y) * 30, 320 + (x - camera.x + y - camera.y) * 15 - z * 30] }
function unproject(screenX, screenY) {
    const difference = (screenX - 480) / 30
    const sum = (screenY - 320) / 15
    return {x: camera.x + (sum + difference) / 2, y: camera.y + (sum - difference) / 2}
}
function diamond(x, y, z, color) {
    const points = [[x, y], [x + 1, y], [x + 1, y + 1], [x, y + 1]].map(function point(item) { return project(item[0], item[1], z) })
    context.fillStyle = color
    context.beginPath()
    points.forEach(function point(item, index) { index ? context.lineTo(...item) : context.moveTo(...item) })
    context.closePath()
    context.fill()
}
function drawBlock(block) {
    diamond(block.x - .5, block.y - .5, .65, block.hp > 1 ? '#f6d08a' : arena.palette.block)
    diamond(block.x - .5, block.y - .5, .02, '#2e2633')
}
function drawOrb(x, y) {
    const [sx, sy] = project(x, y, .45)
    context.fillStyle = '#fff0a6'
    context.beginPath()
    context.arc(sx, sy, 5, 0, Math.PI * 2)
    context.fill()
}
function drawEffect(effect) {
    const [x, y] = project(effect.x, effect.y, .6)
    context.fillStyle = effect.color
    context.globalAlpha = Math.max(effect.life * 2, 0)
    context.beginPath()
    context.arc(x, y, 22 * (1 - effect.life), 0, Math.PI * 2)
    context.fill()
    context.globalAlpha = 1
}
function drawTank(subject) {
    const {model} = subject
    const [x, y] = project(subject.x, subject.y, .15)
    context.save()
    context.translate(x, y)
    context.rotate(screenAngle(subject.heading))
    context.fillStyle = '#0008'
    context.fillRect(-model.bodyLength / 2, 9, model.bodyLength, model.trackWidth + 3)
    context.fillStyle = '#173d2f'
    context.fillRect(-model.bodyLength / 2, -model.bodyWidth / 2 - 2, model.bodyLength, model.trackWidth)
    context.fillRect(-model.bodyLength / 2, model.bodyWidth / 2 - model.trackWidth + 2, model.bodyLength, model.trackWidth)
    context.fillStyle = subject.color
    context.fillRect(-model.bodyLength / 2 + 2, -model.bodyWidth / 2, model.bodyLength - 4, model.bodyWidth)
    context.rotate(screenAngle(subject.turret) - screenAngle(subject.heading))
    context.fillStyle = '#eafff5'
    context.fillRect(0, -3, model.barrelLength, 6)
    context.fillStyle = subject.color
    context.beginPath()
    context.arc(0, 0, model.turretRadius, 0, Math.PI * 2)
    context.fill()
    context.restore()
    if (subject != player) {
        context.fillStyle = '#ffffff'
        context.font = '10px system-ui'
        context.fillText(`${subject.kind} ${subject.hp}`, x - 16, y - 26)
    }
}
function alive(subject) { return subject.alive }
function destroyed(subject) { return !subject.alive }
function distance(a, b) { return Math.hypot(a.x - b.x, a.y - b.y) }
function screenAngle(angle) { return Math.atan2((Math.cos(angle) + Math.sin(angle)) * 15, (Math.cos(angle) - Math.sin(angle)) * 30) }

requestAnimationFrame(frame)
