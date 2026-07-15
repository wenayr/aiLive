export function createPerspectiveRenderer({canvas}) {
    const context = canvas.getContext('2d')

    function render({arena, player, enemies, shells, effects, blocks}) {
        const camera = createCamera(player)
        const polygons = []
        context.fillStyle = arena.palette.background
        context.fillRect(0, 0, canvas.width, canvas.height)
        addGround({arena, camera, polygons})
        blocks.filter(function nearby(block) { return block.alive && distance(block, player) < 22 }).forEach(function block(block) {
            addBox({polygons, camera, x: block.x, y: block.y, z: .8, width: .9, length: .9, height: block.hp > 1 ? 1.6 : 1.05, heading: 0, color: block.hp > 1 ? '#f5c978' : arena.palette.wall})
        })
        enemies.filter(function nearby(enemy) { return enemy.alive && distance(enemy, player) < 26 }).forEach(function enemy(enemy) { addTank({polygons, camera, subject: enemy}) })
        addTank({polygons, camera, subject: player})
        shells.forEach(function shell(shell) { addOrb({polygons, camera, shell}) })
        effects.forEach(function effect(effect) { addEffect({polygons, camera, effect}) })
        polygons.sort(function backToFront(a, b) { return b.depth - a.depth }).forEach(drawPolygon)
        drawCrosshair()
    }

    function createCamera(player) {
        const forward = {x: Math.cos(player.heading), y: Math.sin(player.heading)}
        return {x: player.x - forward.x * 5.2, y: player.y - forward.y * 5.2, z: 4.6, heading: player.heading, focal: 520, horizon: 235}
    }

    function addGround({arena, camera, polygons}) {
        const centerX = Math.floor(camera.x)
        const centerY = Math.floor(camera.y)
        for (let y = centerY - 16; y <= centerY + 16; y += 1) for (let x = centerX - 16; x <= centerX + 16; x += 1) {
            if (x < 0 || y < 0 || x >= arena.size || y >= arena.size) continue
            addPolygon({polygons, camera, points: [[x, y, 0], [x + 1, y, 0], [x + 1, y + 1, 0], [x, y + 1, 0]], color: (x + y) % 2 ? arena.palette.tileA : arena.palette.tileB})
        }
    }

    function addTank({polygons, camera, subject}) {
        const scale = subject.archetype == 'brute' ? 1.22 : subject.archetype == 'scout' ? .82 : 1
        addBox({polygons, camera, x: subject.x, y: subject.y, z: .36, width: .82 * scale, length: 1.22 * scale, height: .48 * scale, heading: subject.heading, color: subject.color})
        addBox({polygons, camera, x: subject.x, y: subject.y, z: .82 * scale, width: .55 * scale, length: .55 * scale, height: .35 * scale, heading: subject.turret, color: lighten(subject.color, 18)})
        const barrel = pointAhead(subject.x, subject.y, subject.turret, .56 * scale)
        addBox({polygons, camera, x: barrel.x, y: barrel.y, z: 1.0 * scale, width: .14 * scale, length: subject.archetype == 'artillery' ? 1.15 : .82, height: .14 * scale, heading: subject.turret, color: '#eef8ff'})
    }

    function addBox({polygons, camera, x, y, z, width, length, height, heading, color}) {
        const corners = orientedCorners({x, y, width, length, heading})
        const bottom = corners.map(function point(point) { return [...point, z - height / 2] })
        const top = corners.map(function point(point) { return [...point, z + height / 2] })
        addPolygon({polygons, camera, points: top, color: lighten(color, 20)})
        addPolygon({polygons, camera, points: [bottom[0], bottom[1], top[1], top[0]], color: darken(color, 18)})
        addPolygon({polygons, camera, points: [bottom[1], bottom[2], top[2], top[1]], color})
        addPolygon({polygons, camera, points: [bottom[2], bottom[3], top[3], top[2]], color: darken(color, 8)})
        addPolygon({polygons, camera, points: [bottom[3], bottom[0], top[0], top[3]], color})
    }

    function addOrb({polygons, camera, shell}) {
        const projected = project(shell.x, shell.y, .7, camera)
        if (!projected) return
        polygons.push({depth: projected.depth, color: '#fff1a3', points: [[projected.x - 4, projected.y], [projected.x, projected.y - 4], [projected.x + 4, projected.y], [projected.x, projected.y + 4]]})
    }

    function addEffect({polygons, camera, effect}) {
        const projected = project(effect.x, effect.y, .5, camera)
        if (!projected) return
        const radius = 18 * (1 - effect.life)
        polygons.push({depth: projected.depth, color: effect.color, alpha: Math.max(effect.life * 2, 0), points: [[projected.x - radius, projected.y], [projected.x, projected.y - radius], [projected.x + radius, projected.y], [projected.x, projected.y + radius]]})
    }

    function addPolygon({polygons, camera, points, color}) {
        const projected = points.map(function point(point) { return project(point[0], point[1], point[2], camera) })
        if (projected.some(function hidden(point) { return !point })) return
        polygons.push({depth: projected.reduce(function total(sum, point) { return sum + point.depth }, 0) / projected.length, color, points: projected})
    }

    function project(x, y, z, camera) {
        const dx = x - camera.x
        const dy = y - camera.y
        const forward = dx * Math.cos(camera.heading) + dy * Math.sin(camera.heading)
        if (forward < .25) return null
        const right = -dx * Math.sin(camera.heading) + dy * Math.cos(camera.heading)
        return {x: canvas.width / 2 + right * camera.focal / forward, y: camera.horizon + (camera.z - z) * camera.focal / forward, depth: forward}
    }

    function drawPolygon(polygon) {
        context.globalAlpha = polygon.alpha ?? 1
        context.fillStyle = polygon.color
        context.beginPath()
        polygon.points.forEach(function point(point, index) { index ? context.lineTo(point.x ?? point[0], point.y ?? point[1]) : context.moveTo(point.x ?? point[0], point.y ?? point[1]) })
        context.closePath()
        context.fill()
        context.globalAlpha = 1
    }

    function drawCrosshair() {
        context.strokeStyle = '#ffffffaa'
        context.lineWidth = 1
        context.beginPath()
        context.arc(canvas.width / 2, canvas.height / 2, 8, 0, Math.PI * 2)
        context.moveTo(canvas.width / 2 - 14, canvas.height / 2)
        context.lineTo(canvas.width / 2 + 14, canvas.height / 2)
        context.moveTo(canvas.width / 2, canvas.height / 2 - 14)
        context.lineTo(canvas.width / 2, canvas.height / 2 + 14)
        context.stroke()
    }

    return {render}
}

function orientedCorners({x, y, width, length, heading}) {
    const forward = {x: Math.cos(heading) * length / 2, y: Math.sin(heading) * length / 2}
    const right = {x: -Math.sin(heading) * width / 2, y: Math.cos(heading) * width / 2}
    return [[x - forward.x - right.x, y - forward.y - right.y], [x + forward.x - right.x, y + forward.y - right.y], [x + forward.x + right.x, y + forward.y + right.y], [x - forward.x + right.x, y - forward.y + right.y]]
}
function pointAhead(x, y, heading, amount) { return {x: x + Math.cos(heading) * amount, y: y + Math.sin(heading) * amount} }
function distance(a, b) { return Math.hypot(a.x - b.x, a.y - b.y) }
function lighten(color, amount) { return shift(color, amount) }
function darken(color, amount) { return shift(color, -amount) }
function shift(color, amount) {
    const numeric = Number.parseInt(color.slice(1), 16)
    const channel = function channel(offset) { return Math.max(0, Math.min(255, (numeric >> offset & 255) + amount)).toString(16).padStart(2, '0') }
    return `#${channel(16)}${channel(8)}${channel(0)}`
}
