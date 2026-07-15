export function createPerspectiveRenderer({canvas}) {
    const context = canvas.getContext('2d')

    function render({arena, player, enemies, shells, effects, blocks, terrain = flatTerrain}) {
        const camera = createCamera(player)
        const polygons = []
        context.fillStyle = arena.palette.background
        context.fillRect(0, 0, canvas.width, canvas.height)
        addGround({arena, camera, polygons, terrain})
        blocks.filter(function nearby(block) { return block.alive && distance(block, player) < 22 }).forEach(function block(block) {
            addBox({polygons, camera, x: block.x, y: block.y, z: terrain.heightAt(block.x, block.y) + .8, width: .9, length: .9, height: block.hp > 1 ? 1.6 : 1.05, heading: 0, color: block.hp > 1 ? '#f5c978' : arena.palette.wall})
        })
        terrain.landmarks.filter(function nearby(item) { return distance(item, player) < 26 }).forEach(function landmark(item) { addLandmark({polygons, camera, item, terrain}) })
        enemies.filter(function nearby(enemy) { return enemy.alive && distance(enemy, player) < 26 }).forEach(function enemy(enemy) { addTank({polygons, camera, subject: enemy, terrain}) })
        addTank({polygons, camera, subject: player, terrain})
        shells.forEach(function shell(shell) { addOrb({polygons, camera, shell}) })
        effects.forEach(function effect(effect) { addEffect({polygons, camera, effect}) })
        polygons.sort(function backToFront(a, b) { return b.depth - a.depth }).forEach(drawPolygon)
        drawCrosshair()
    }

    function createCamera(player) {
        const forward = {x: Math.cos(player.heading), y: Math.sin(player.heading)}
        return {x: player.x - forward.x * 5.2, y: player.y - forward.y * 5.2, z: 4.6, heading: player.heading, focal: 520, horizon: 235}
    }

    function addGround({arena, camera, polygons, terrain}) {
        const centerX = Math.floor(camera.x)
        const centerY = Math.floor(camera.y)
        for (let y = centerY - 16; y <= centerY + 16; y += 1) for (let x = centerX - 16; x <= centerX + 16; x += 1) {
            if (x < 0 || y < 0 || x >= arena.size || y >= arena.size) continue
            addPolygon({polygons, camera, points: [[x, y, terrain.heightAt(x, y)], [x + 1, y, terrain.heightAt(x + 1, y)], [x + 1, y + 1, terrain.heightAt(x + 1, y + 1)], [x, y + 1, terrain.heightAt(x, y + 1)]], color: (x + y) % 2 ? arena.palette.tileA : arena.palette.tileB})
        }
    }

    function addTank({polygons, camera, subject, terrain}) {
        const scale = subject.archetype == 'brute' ? 1.22 : subject.archetype == 'scout' ? .82 : 1
        const elevation = terrain.heightAt(subject.x, subject.y)
        addBox({polygons, camera, x: subject.x, y: subject.y, z: elevation + .36, width: .82 * scale, length: 1.22 * scale, height: .48 * scale, heading: subject.heading, color: subject.color})
        addCylinder({polygons, camera, x: subject.x, y: subject.y, z: elevation + .82 * scale, radius: .35 * scale, height: .35 * scale, color: lighten(subject.color, 18)})
        const barrel = pointAhead(subject.x, subject.y, subject.turret, .56 * scale)
        addBox({polygons, camera, x: barrel.x, y: barrel.y, z: elevation + 1.0 * scale, width: .14 * scale, length: subject.archetype == 'artillery' ? 1.15 : .82, height: .14 * scale, heading: subject.turret, color: '#eef8ff'})
    }

    function addLandmark({polygons, camera, item, terrain}) {
        const z = terrain.heightAt(item.x, item.y)
        const colors = ['#d89a5a', '#71a878', '#6ea9b6']
        if (item.kind == 'pond') {
            addCylinder({polygons, camera, x: item.x, y: item.y, z: z - .06, radius: item.scale * 1.1, height: .08, color: '#55b9cf'})
            return
        }
        if (item.kind == 'arch') {
            addCylinder({polygons, camera, x: item.x - item.scale * .55, y: item.y, z: z + item.scale * .45, radius: item.scale * .26, height: item.scale * .9, color: colors[item.hue]})
            addCylinder({polygons, camera, x: item.x + item.scale * .55, y: item.y, z: z + item.scale * .45, radius: item.scale * .26, height: item.scale * .9, color: colors[item.hue]})
            addTorusArc({polygons, camera, x: item.x, y: item.y, z: z + item.scale * .85, radius: item.scale * .55, thickness: item.scale * .25, color: colors[item.hue]})
            return
        }
        addCylinder({polygons, camera, x: item.x, y: item.y, z: z + item.scale * (item.kind == 'spire' ? .9 : .42), radius: item.scale * (item.kind == 'spire' ? .32 : .62), height: item.scale * (item.kind == 'spire' ? 1.8 : .84), color: colors[item.hue]})
    }

    function addCylinder({polygons, camera, x, y, z, radius, height, color}) {
        const sides = 8
        const bottom = []
        const top = []
        for (let index = 0; index < sides; index += 1) {
            const angle = index / sides * Math.PI * 2
            bottom.push([x + Math.cos(angle) * radius, y + Math.sin(angle) * radius, z - height / 2])
            top.push([x + Math.cos(angle) * radius, y + Math.sin(angle) * radius, z + height / 2])
        }
        addPolygon({polygons, camera, points: top, color: lighten(color, 18)})
        for (let index = 0; index < sides; index += 1) addPolygon({polygons, camera, points: [bottom[index], bottom[(index + 1) % sides], top[(index + 1) % sides], top[index]], color: index % 2 ? color : darken(color, 15)})
    }

    function addTorusArc({polygons, camera, x, y, z, radius, thickness, color}) {
        const points = []
        for (let index = 0; index <= 8; index += 1) {
            const angle = Math.PI - index / 8 * Math.PI
            points.push([x + Math.cos(angle) * radius, y, z + Math.sin(angle) * radius])
        }
        for (let index = 0; index < points.length - 1; index += 1) addBox({polygons, camera, x: (points[index][0] + points[index + 1][0]) / 2, y, z: (points[index][2] + points[index + 1][2]) / 2, width: thickness, length: Math.hypot(points[index + 1][0] - points[index][0], points[index + 1][2] - points[index][2]) + thickness, height: thickness, heading: Math.PI / 2, color})
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
const flatTerrain = {heightAt: function heightAt() { return 0 }, landmarks: []}
