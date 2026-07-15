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
const arena = {size: 13, key: manualMaps[mapKey] ? mapKey : 'crossroads', ...selectedMap}
const player = createPlayer()
const blocks = arena.blocks.map(function block(item, index) { return {id: `block-${index + 1}`, x: item[0] + .5, y: item[1] + .5, hp: item[2] ?? 1, alive: true} })
const shells = []
const effects = []
let aim = {x: 6, y: 0}
let lastShotAt = 0
let lastTime = performance.now()
let paused = false

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
function createPlayer() { return {x: 6, y: 10, heading: -Math.PI / 2, turret: -Math.PI / 2, speed: 3.3, shellSpeed: 8, color: '#8ff0c0', model: {bodyLength: 38, bodyWidth: 22, trackWidth: 7, turretRadius: 10, barrelLength: 30}} }

function frame(now) {
    const delta = Math.min((now - lastTime) / 1000, .04)
    lastTime = now
    if (!paused) update(delta, now)
    draw()
    hud.textContent = `${paused ? 'PAUSED · ' : ''}${arena.key} · objects ${blocks.filter(alive).length} · destroyed ${blocks.filter(destroyed).length}`
    requestAnimationFrame(frame)
}

function update(delta, now) {
    if (keys.has('a')) player.heading -= delta * 2.6
    if (keys.has('d')) player.heading += delta * 2.6
    player.turret = Math.atan2(aim.y - player.y, aim.x - player.x)
    const direction = (keys.has('w') ? 1 : 0) - (keys.has('s') ? 1 : 0)
    movePlayer(Math.cos(player.heading) * direction * delta * player.speed, Math.sin(player.heading) * direction * delta * player.speed)
    if (keys.has(' ') && now - lastShotAt > 260) {
        shells.push({x: player.x, y: player.y, vx: Math.cos(player.turret) * player.shellSpeed, vy: Math.sin(player.turret) * player.shellSpeed, life: 1.4})
        lastShotAt = now
    }
    shells.forEach(moveShell(delta))
    effects.forEach(function fade(effect) { effect.life -= delta })
    while (shells.length && shells[0].life <= 0) shells.shift()
    while (effects.length && effects[0].life <= 0) effects.shift()
}

function movePlayer(dx, dy) {
    const x = Math.max(.5, Math.min(arena.size - 1.5, player.x + dx))
    const y = Math.max(.5, Math.min(arena.size - 1.5, player.y + dy))
    if (!blocks.some(function blocked(block) { return block.alive && Math.hypot(block.x - x, block.y - y) < .75 })) {
        player.x = x
        player.y = y
    }
}
function moveShell(delta) {
    return function move(shell) {
        shell.x += shell.vx * delta
        shell.y += shell.vy * delta
        shell.life -= delta
        const block = blocks.find(function hit(item) { return item.alive && Math.hypot(shell.x - item.x, shell.y - item.y) < .55 })
        if (block) damageBlock(block)
        if (shell.x < 0 || shell.y < 0 || shell.x > arena.size || shell.y > arena.size) shell.life = 0
    }
}
function damageBlock(block) {
    block.hp -= 1
    effects.push({x: block.x, y: block.y, life: .42, color: block.hp < 1 ? '#fff0a6' : '#ffd08a'})
    if (block.hp < 1) block.alive = false
}

function draw() {
    context.clearRect(0, 0, canvas.width, canvas.height)
    context.fillStyle = arena.palette.background
    context.fillRect(0, 0, canvas.width, canvas.height)
    for (let y = 0; y < arena.size; y += 1) for (let x = 0; x < arena.size; x += 1) diamond(x, y, 0, (x + y) % 2 ? arena.palette.tileA : arena.palette.tileB)
    blocks.filter(alive).forEach(drawBlock)
    shells.forEach(function shell(item) { drawOrb(item.x, item.y) })
    effects.forEach(drawEffect)
    drawTank()
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
function drawTank() {
    const {model} = player
    const [x, y] = project(player.x, player.y, .15)
    context.save()
    context.translate(x, y)
    context.rotate(player.heading + Math.PI / 4)
    context.fillStyle = '#0008'
    context.fillRect(-model.bodyLength / 2, 9, model.bodyLength, model.trackWidth + 3)
    context.fillStyle = '#173d2f'
    context.fillRect(-model.bodyLength / 2, -model.bodyWidth / 2 - 2, model.bodyLength, model.trackWidth)
    context.fillRect(-model.bodyLength / 2, model.bodyWidth / 2 - model.trackWidth + 2, model.bodyLength, model.trackWidth)
    context.fillStyle = player.color
    context.fillRect(-model.bodyLength / 2 + 2, -model.bodyWidth / 2, model.bodyLength - 4, model.bodyWidth)
    context.rotate(player.turret - player.heading)
    context.fillStyle = '#eafff5'
    context.fillRect(-3, -model.barrelLength, 6, model.barrelLength)
    context.fillStyle = player.color
    context.beginPath()
    context.arc(0, 0, model.turretRadius, 0, Math.PI * 2)
    context.fill()
    context.restore()
}
function alive(subject) { return subject.alive }
function destroyed(subject) { return !subject.alive }

requestAnimationFrame(frame)
