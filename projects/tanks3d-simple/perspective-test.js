const canvas = document.querySelector('#game')
const context = canvas.getContext('2d')
const hud = document.querySelector('#hud')
const pressed = new Set()
const actor = createTank('player', 54, 69, '#46623d', 5, 3.1, 8.4)
const hostiles = [
    createTank('scout', 56, 52, '#87613f', 1, 2, 7.2),
    createTank('heavy', 43, 45, '#77554b', 3, .92, 5.8),
    createTank('gun', 67, 39, '#536a63', 2, 1.15, 10.5),
]
const nature = seedNature()
const rounds = []
const flashes = []
let previousFrame = performance.now()
let playerShotAt = 0
let hostileShotAt = 0
let held = false
let desiredTurret = actor.hull

window.addEventListener('keydown', function onKeyDown(event) {
    pressed.add(event.key.toLowerCase())
    if (event.code == 'Space') event.preventDefault()
    if (!event.repeat && event.key.toLowerCase() == 'p') held = !held
    if (!event.repeat && event.key.toLowerCase() == 'r') location.reload()
})
window.addEventListener('keyup', function onKeyUp(event) { pressed.delete(event.key.toLowerCase()) })
canvas.addEventListener('pointermove', function onAim(event) {
    const bounds = canvas.getBoundingClientRect()
    desiredTurret = actor.hull + ((event.clientX - bounds.left) / bounds.width - .5) * 1.45
})

function createTank(role, x, y, paint, health, speed, muzzleSpeed) {
    return {role, x, y, paint, health, speed, muzzleSpeed, hull: -Math.PI / 2, turret: -Math.PI / 2, alive: true}
}
function seedNature() {
    const items = []
    const clearings = [[54, 69, 8], [56, 52, 5], [43, 45, 5], [67, 39, 5]]
    for (let band = 0; band < 18; band += 1) for (let step = 0; step < 18; step += 1) {
        const x = 13 + step * 5.2 + (band % 2) * 1.8
        const y = 25 + band * 4.8
        const signature = (step * 19 + band * 31 + step * band * 3) % 17
        if (clearings.some(function inClearing(clearing) { return Math.hypot(x - clearing[0], y - clearing[1]) < clearing[2] }) || signature < 5) continue
        if (signature < 12) items.push(feature(signature % 3 == 0 ? 'pine' : 'broadleaf', x, y, 1.1 + signature * .035, 4.3 + signature * .12, 1))
        else items.push(feature('boulder', x, y, 1.1 + signature * .09, .8 + signature * .08, 2))
    }
    ;[[22, 31], [32, 34], [41, 29], [74, 34], [82, 27], [91, 32]].forEach(function shoreStone(point, index) {
        items.push(feature('shore', point[0], point[1], 2.2 + index % 2, .7, 2))
    })
    ;[[35, 75], [42, 78], [50, 76], [68, 77], [75, 74]].forEach(function shelter(point, index) {
        items.push(feature('cottage', point[0], point[1], 2.2 + index % 2, 2.6, 3))
    })
    return items
}
function feature(kind, x, y, width, height, health) { return {kind, x, y, width, height, health, alive: true} }

function cycle(now) {
    const elapsed = Math.min((now - previousFrame) / 1000, .04)
    previousFrame = now
    if (!held) simulate(elapsed, now)
    render()
    hud.textContent = `${held ? 'PAUSED · ' : ''}TIDAL VALE · hull ${actor.health} · enemies ${hostiles.filter(living).length} · living cover ${nature.filter(living).length} · cleared ${nature.filter(gone).length}`
    requestAnimationFrame(cycle)
}
function simulate(elapsed, now) {
    if (pressed.has('a')) actor.hull -= elapsed * 2.45
    if (pressed.has('d')) actor.hull += elapsed * 2.45
    actor.turret = desiredTurret
    const drive = (pressed.has('w') ? 1 : 0) - (pressed.has('s') ? 1 : 0)
    advance(actor, Math.cos(actor.hull) * drive * actor.speed * elapsed, Math.sin(actor.hull) * drive * actor.speed * elapsed)
    if (pressed.has(' ') && now - playerShotAt > 250) { fire(actor); playerShotAt = now }
    hostiles.filter(living).forEach(function pursue(enemy) {
        const direction = Math.atan2(actor.y - enemy.y, actor.x - enemy.x)
        enemy.hull = direction
        enemy.turret = direction
        if (range(enemy, actor) > 4.5) advance(enemy, Math.cos(direction) * enemy.speed * elapsed, Math.sin(direction) * enemy.speed * elapsed)
    })
    if (now - hostileShotAt > 880) {
        const shooter = hostiles.find(function canSee(enemy) { return enemy.alive && range(enemy, actor) < 16 })
        if (shooter) { fire(shooter); hostileShotAt = now }
    }
    rounds.forEach(function travel(round) {
        round.x += round.vx * elapsed
        round.y += round.vy * elapsed
        round.life -= elapsed
        const struck = impact(round)
        if (struck) hurt(struck)
    })
    flashes.forEach(function fade(flash) { flash.life -= elapsed })
    prune(rounds)
    prune(flashes)
}
function advance(unit, dx, dy) {
    const x = Math.max(4, Math.min(124, unit.x + dx))
    const y = Math.max(36, Math.min(124, unit.y + dy))
    if (!nature.some(function obstructs(item) { return item.alive && Math.hypot(item.x - x, item.y - y) < Math.max(.72, item.width * .44) })) { unit.x = x; unit.y = y }
}
function fire(owner) { rounds.push({owner, x: owner.x, y: owner.y, vx: Math.cos(owner.turret) * owner.muzzleSpeed, vy: Math.sin(owner.turret) * owner.muzzleSpeed, life: 1.7}) }
function impact(round) {
    const cover = nature.find(function hit(item) { return item.alive && range(round, item) < Math.max(.52, item.width * .34) })
    if (cover) return cover
    return (round.owner == actor ? hostiles : [actor]).find(function hit(unit) { return unit.alive && range(round, unit) < .55 })
}
function hurt(target) {
    target.health -= 1
    flashes.push({x: target.x, y: target.y, z: heightAt(target.x, target.y) + .75, life: .38, color: target.health < 1 ? '#fff2ba' : '#e99c56'})
    if (target.health < 1) target.alive = false
}
function prune(items) { while (items.length && items[0].life <= 0) items.shift() }

function render() {
    const atmosphere = context.createLinearGradient(0, 0, 0, canvas.height)
    atmosphere.addColorStop(0, '#3c6688')
    atmosphere.addColorStop(.58, '#b7d1cf')
    atmosphere.addColorStop(1, '#d4d1a6')
    context.fillStyle = atmosphere
    context.fillRect(0, 0, canvas.width, canvas.height)
    paintDistantWeather()
    const eye = makeEye()
    const facets = []
    paintGround(facets, eye)
    nature.filter(function near(item) { return item.alive && range(item, actor) < 36 }).forEach(function drawFeature(item) { drawFeatureModel(facets, eye, item) })
    hostiles.filter(function near(unit) { return unit.alive && range(unit, actor) < 28 }).forEach(function drawEnemy(unit) { drawTank(facets, eye, unit) })
    drawTank(facets, eye, actor)
    rounds.forEach(function drawRound(round) { speck(facets, project(round.x, round.y, heightAt(round.x, round.y) + .72, eye), '#fff6bd', 4) })
    flashes.forEach(function drawFlash(flash) { speck(facets, project(flash.x, flash.y, flash.z, eye), flash.color, 18 * flash.life * 2, flash.life * 2) })
    facets.sort(function backToFront(a, b) { return b.distance - a.distance }).forEach(fillFacet)
    drawReticle()
}
function makeEye() {
    return {x: actor.x - Math.cos(actor.hull) * 5.9, y: actor.y - Math.sin(actor.hull) * 5.9, z: heightAt(actor.x, actor.y) + 5.1, heading: actor.hull, focal: 590, horizon: 224}
}
function paintDistantWeather() {
    context.fillStyle = '#e7eee7a0'
    ;[[110, 90, 105], [380, 116, 130], [730, 75, 115]].forEach(function mass(cloud) {
        context.beginPath()
        context.ellipse(cloud[0], cloud[1], cloud[2], cloud[2] * .23, 0, 0, Math.PI * 2)
        context.fill()
    })
    context.fillStyle = '#5b7380'
    context.beginPath()
    context.moveTo(0, 250)
    context.lineTo(126, 193)
    context.lineTo(255, 239)
    context.lineTo(405, 170)
    context.lineTo(566, 237)
    context.lineTo(750, 180)
    context.lineTo(960, 244)
    context.lineTo(960, 295)
    context.lineTo(0, 295)
    context.closePath()
    context.fill()
}
function paintGround(facets, eye) {
    const baseX = Math.floor(eye.x) - 23
    const baseY = Math.floor(eye.y) - 23
    for (let y = baseY; y < baseY + 47; y += 1) for (let x = baseX; x < baseX + 47; x += 1) {
        if (x < 0 || y < 0 || x > 129 || y > 129) continue
        const corners = [[x, y, heightAt(x, y)], [x + 1, y, heightAt(x + 1, y)], [x + 1, y + 1, heightAt(x + 1, y + 1)], [x, y + 1, heightAt(x, y + 1)]]
        face(facets, eye, corners, underwater(x + .5, y + .5) ? seaTint(x, y) : soilTint(x, y))
    }
}
function heightAt(x, y) {
    if (underwater(x, y)) return -.36
    const coastalRise = Math.max(0, y - shoreAt(x)) * .108
    const ridge = Math.sin(x * .18) * .34 + Math.cos(y * .145) * .29 + Math.sin((x - y) * .083) * .58
    return Math.min(4.8, coastalRise + ridge)
}
function shoreAt(x) { return 31 + Math.sin(x * .105) * 3.4 + Math.sin(x * .037 + 1) * 4.5 }
function underwater(x, y) { return y < shoreAt(x) }
function seaTint(x, y) { return (x * 3 + y) % 4 == 0 ? '#3d879a' : '#4f9fb1' }
function soilTint(x, y) {
    const variation = Math.round((Math.sin(x * 2.2 + y * 1.7) + 1) * 5)
    const marsh = y - shoreAt(x) < 5
    const red = marsh ? 85 : 67
    const green = marsh ? 108 : 123
    const blue = marsh ? 69 : 58
    return `#${(red + variation).toString(16)}${(green + variation).toString(16)}${(blue + variation).toString(16)}`
}
function drawFeatureModel(facets, eye, item) {
    const ground = heightAt(item.x, item.y)
    if (item.kind == 'pine') {
        prism(facets, eye, item.x, item.y, ground + item.height * .2, .22, .22, item.height * .4, 0, '#604831')
        crown(facets, eye, item.x, item.y, ground + item.height * .42, item.width, item.height * .7, '#28593a', 7)
        crown(facets, eye, item.x, item.y, ground + item.height * .72, item.width * .72, item.height * .56, '#337145', 7)
    } else if (item.kind == 'broadleaf') {
        prism(facets, eye, item.x, item.y, ground + item.height * .18, .28, .28, item.height * .36, 0, '#654932')
        crown(facets, eye, item.x, item.y, ground + item.height * .45, item.width * 1.12, item.height * .7, '#3c7040', 8)
    } else if (item.kind == 'boulder') crown(facets, eye, item.x, item.y, ground, item.width, item.height, '#777567', 7)
    else if (item.kind == 'shore') prism(facets, eye, item.x, item.y, ground + item.height * .45, item.width, .8, item.height, 0, '#827964')
    else {
        prism(facets, eye, item.x, item.y, ground + item.height * .38, item.width, item.width * .88, item.height * .76, 0, '#9b7452')
        gable(facets, eye, item.x, item.y, item.width, item.width * .88, ground + item.height * .76)
    }
}
function drawTank(facets, eye, unit) {
    const scale = unit.role == 'heavy' ? 1.24 : unit.role == 'scout' ? .83 : 1
    const ground = heightAt(unit.x, unit.y)
    const side = {x: -Math.sin(unit.hull) * .39 * scale, y: Math.cos(unit.hull) * .39 * scale}
    prism(facets, eye, unit.x + side.x, unit.y + side.y, ground + .22 * scale, .28 * scale, 1.42 * scale, .38 * scale, unit.hull, '#252a23')
    prism(facets, eye, unit.x - side.x, unit.y - side.y, ground + .22 * scale, .28 * scale, 1.42 * scale, .38 * scale, unit.hull, '#252a23')
    prism(facets, eye, unit.x, unit.y, ground + .51 * scale, .84 * scale, 1.25 * scale, .54 * scale, unit.hull, unit.paint)
    const wedge = forward(unit, .28 * scale, unit.hull)
    prism(facets, eye, wedge.x, wedge.y, ground + .74 * scale, .68 * scale, .58 * scale, .22 * scale, unit.hull, tint(unit.paint, 15))
    crown(facets, eye, unit.x, unit.y, ground + .74 * scale, .54 * scale, .45 * scale, tint(unit.paint, 8), 8)
    const barrel = forward(unit, .72 * scale, unit.turret)
    prism(facets, eye, barrel.x, barrel.y, ground + .96 * scale, .13 * scale, unit.role == 'gun' ? 1.38 * scale : 1.02 * scale, .14 * scale, unit.turret, '#28342f')
    const tip = forward(unit, unit.role == 'gun' ? 1.42 * scale : 1.08 * scale, unit.turret)
    prism(facets, eye, tip.x, tip.y, ground + .96 * scale, .2 * scale, .19 * scale, .18 * scale, unit.turret, '#161d1a')
}
function gable(facets, eye, x, y, width, length, z) {
    face(facets, eye, [[x - width / 2, y - length / 2, z], [x + width / 2, y - length / 2, z], [x, y, z + .95]], '#6c4738')
    face(facets, eye, [[x + width / 2, y - length / 2, z], [x + width / 2, y + length / 2, z], [x, y, z + .95]], '#76503d')
    face(facets, eye, [[x + width / 2, y + length / 2, z], [x - width / 2, y + length / 2, z], [x, y, z + .95]], '#55392f')
    face(facets, eye, [[x - width / 2, y + length / 2, z], [x - width / 2, y - length / 2, z], [x, y, z + .95]], '#875d44')
}
function crown(facets, eye, x, y, z, radius, height, color, sides = 7) {
    const ring = []
    for (let index = 0; index < sides; index += 1) {
        const angle = index / sides * Math.PI * 2
        ring.push([x + Math.cos(angle) * radius, y + Math.sin(angle) * radius, z])
    }
    for (let index = 0; index < sides; index += 1) face(facets, eye, [ring[index], ring[(index + 1) % sides], [x, y, z + height]], tint(color, index % 2 ? -12 : 7))
}
function prism(facets, eye, x, y, z, width, length, height, angle, color) {
    const ground = rectangle(x, y, width, length, angle).map(function point(point) { return [...point, z - height / 2] })
    const top = ground.map(function point(point) { return [point[0], point[1], z + height / 2] })
    face(facets, eye, top, tint(color, 18))
    for (let index = 0; index < 4; index += 1) face(facets, eye, [ground[index], ground[(index + 1) % 4], top[(index + 1) % 4], top[index]], tint(color, -15 + index * 5))
}
function rectangle(x, y, width, length, angle) {
    const along = {x: Math.cos(angle) * length / 2, y: Math.sin(angle) * length / 2}
    const across = {x: -Math.sin(angle) * width / 2, y: Math.cos(angle) * width / 2}
    return [[x - along.x - across.x, y - along.y - across.y], [x + along.x - across.x, y + along.y - across.y], [x + along.x + across.x, y + along.y + across.y], [x - along.x + across.x, y - along.y + across.y]]
}
function face(facets, eye, points, color) {
    const visible = points.map(function vertex(vertex) { return project(vertex[0], vertex[1], vertex[2], eye) })
    if (visible.some(function absent(point) { return !point })) return
    facets.push({distance: visible.reduce(function sum(total, point) { return total + point.distance }, 0) / visible.length, color, points: visible})
}
function project(x, y, z, eye) {
    const dx = x - eye.x
    const dy = y - eye.y
    const forwardDistance = dx * Math.cos(eye.heading) + dy * Math.sin(eye.heading)
    if (forwardDistance < .25) return null
    const sideways = -dx * Math.sin(eye.heading) + dy * Math.cos(eye.heading)
    return {x: 480 + sideways * eye.focal / forwardDistance, y: eye.horizon + (eye.z - z) * eye.focal / forwardDistance, distance: forwardDistance}
}
function speck(facets, point, color, size, alpha = 1) { if (point) facets.push({distance: point.distance, color, alpha, points: [[point.x - size, point.y], [point.x, point.y - size], [point.x + size, point.y], [point.x, point.y + size]]}) }
function fillFacet(facet) {
    context.globalAlpha = facet.alpha ?? 1
    context.fillStyle = facet.color
    context.beginPath()
    facet.points.forEach(function point(point, index) { index ? context.lineTo(point.x, point.y) : context.moveTo(point.x, point.y) })
    context.closePath()
    context.fill()
    context.globalAlpha = 1
}
function drawReticle() {
    context.strokeStyle = '#fff8dcc7'
    context.lineWidth = 1.2
    context.beginPath()
    context.arc(480, 320, 8, 0, Math.PI * 2)
    context.moveTo(465, 320)
    context.lineTo(495, 320)
    context.moveTo(480, 305)
    context.lineTo(480, 335)
    context.stroke()
}
function forward(unit, amount, angle = unit.turret) { return {x: unit.x + Math.cos(angle) * amount, y: unit.y + Math.sin(angle) * amount} }
function tint(hex, amount) {
    const value = Number.parseInt(hex.slice(1), 16)
    const component = function component(offset) { return Math.max(0, Math.min(255, (value >> offset & 255) + amount)).toString(16).padStart(2, '0') }
    return `#${component(16)}${component(8)}${component(0)}`
}
function living(item) { return item.alive }
function gone(item) { return !item.alive }
function range(a, b) { return Math.hypot(a.x - b.x, a.y - b.y) }
requestAnimationFrame(cycle)
