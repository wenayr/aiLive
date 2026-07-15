export function createPerspectiveRenderer({canvas}) {
    const context = canvas.getContext('2d')
    function render({world, player, enemies, shells, effects}) {
        const camera = makeCamera(player)
        const polygons = []
        paintSky()
        addTerrain({world, player, camera, polygons})
        world.flora.filter(function near(item) { return item.alive && distance(item, player) < 33 }).forEach(function item(item) { addFlora({item, world, camera, polygons}) })
        world.cover.filter(function near(item) { return item.alive && distance(item, player) < 30 }).forEach(function item(item) { addRock({item, world, camera, polygons}) })
        enemies.filter(function alive(item) { return item.alive && distance(item, player) < 30 }).forEach(function tank(tank) { addTank({tank, world, camera, polygons}) })
        addTank({tank: player, world, camera, polygons})
        shells.forEach(function shell(shell) { addDiamond({polygons, camera, x: shell.x, y: shell.y, z: world.heightAt(shell.x, shell.y) + .65, color: '#fff2ab', radius: 4}) })
        effects.forEach(function effect(effect) { addDiamond({polygons, camera, x: effect.x, y: effect.y, z: world.heightAt(effect.x, effect.y) + .8, color: effect.color, radius: 20 * (1 - effect.life), alpha: effect.life * 2}) })
        polygons.sort(function depth(a, b) { return b.depth - a.depth }).forEach(draw)
        crosshair()
    }
    function paintSky() {
        const sky = context.createLinearGradient(0, 0, 0, canvas.height)
        sky.addColorStop(0, '#5e96bd'); sky.addColorStop(.6, '#cadfd5'); sky.addColorStop(1, '#d8d09c')
        context.fillStyle = sky; context.fillRect(0, 0, canvas.width, canvas.height)
        context.fillStyle = '#fff5cd'; context.beginPath(); context.arc(760, 110, 38, 0, Math.PI * 2); context.fill()
        context.fillStyle = '#607989'; context.beginPath(); context.moveTo(0, 370)
        for (let x = 0; x <= canvas.width; x += 64) context.lineTo(x, 338 + Math.sin(x * .018) * 20 + Math.cos(x * .052) * 15)
        context.lineTo(canvas.width, 450); context.lineTo(0, 450); context.closePath(); context.fill()
    }
    function addTerrain({world, player, camera, polygons}) {
        const radius = 33
        for (let y = Math.floor(player.y) - radius; y <= Math.floor(player.y) + radius; y += 2) for (let x = Math.floor(player.x) - radius; x <= Math.floor(player.x) + radius; x += 2) {
            if (x < 0 || y < 0 || x >= world.size || y >= world.size) continue
            const sea = world.isSea(x + 1, y + 1)
            const heights = sea ? [0, 0, 0, 0] : [world.heightAt(x, y), world.heightAt(x + 2, y), world.heightAt(x + 2, y + 2), world.heightAt(x, y + 2)]
            const color = sea ? ((x + y) % 4 ? '#3f849a' : '#61a2ad') : heights[0] > 2.6 ? '#7c8060' : heights[0] > 1.3 ? '#708a55' : '#7d9c61'
            polygon({polygons, camera, points: [[x, y, heights[0]], [x + 2, y, heights[1]], [x + 2, y + 2, heights[2]], [x, y + 2, heights[3]]], color})
        }
    }
    function addFlora({item, world, camera, polygons}) {
        const ground = world.heightAt(item.x, item.y)
        if (item.type == 'tree') {
            box({polygons, camera, x: item.x, y: item.y, z: ground + item.scale * .35, width: .16 * item.scale, length: .16 * item.scale, height: .7 * item.scale, heading: 0, color: '#604835'})
            pyramid({polygons, camera, x: item.x, y: item.y, z: ground + item.scale * 1.2, radius: item.scale * .72, height: item.scale * 1.7, color: item.tone == 'sunny' ? '#2d6e45' : '#20503a'})
        } else {
            pyramid({polygons, camera, x: item.x, y: item.y, z: ground + item.scale * .38, radius: item.scale * .8, height: item.scale * .76, color: item.tone == 'sunny' ? '#668746' : '#41633a'})
        }
    }
    function addRock({item, world, camera, polygons}) {
        const z = world.heightAt(item.x, item.y); const s = item.scale
        const base = [[item.x - s, item.y - s, z], [item.x + s, item.y - s * .6, z], [item.x + s * .7, item.y + s, z], [item.x - s * .8, item.y + s * .65, z]]; const peak = [item.x + s * .1, item.y, z + s]
        base.forEach(function point(point, index) { polygon({polygons, camera, points: [point, base[(index + 1) % 4], peak], color: index % 2 ? '#877c6b' : '#665f57'}) })
    }
    function addTank({tank, world, camera, polygons}) {
        const scale = tank.archetype == 'brute' ? 1.2 : tank.archetype == 'scout' ? .8 : 1; const ground = world.heightAt(tank.x, tank.y)
        box({polygons, camera, x: tank.x, y: tank.y, z: ground + .37 * scale, width: 1.08 * scale, length: 1.78 * scale, height: .54 * scale, heading: tank.heading, color: tank.color})
        for (const side of [-1, 1]) {
            const track = lateral(tank.x, tank.y, tank.heading, side * .64 * scale)
            box({polygons, camera, x: track.x, y: track.y, z: ground + .22 * scale, width: .28 * scale, length: 1.85 * scale, height: .38 * scale, heading: tank.heading, color: '#29332e'})
            for (const along of [-.55, 0, .55]) { const point = lateral(...Object.values(ahead(tank.x, tank.y, tank.heading, along * scale)), tank.heading, side * .8 * scale); addDiamond({polygons, camera, x: point.x, y: point.y, z: ground + .23 * scale, color: '#15201a', radius: 4 * scale}) }
        }
        box({polygons, camera, x: tank.x - Math.cos(tank.heading) * .12 * scale, y: tank.y - Math.sin(tank.heading) * .12 * scale, z: ground + .79 * scale, width: .86 * scale, length: .9 * scale, height: .4 * scale, heading: tank.turret, color: shift(tank.color, 20)})
        const barrel = ahead(tank.x, tank.y, tank.turret, .88 * scale)
        box({polygons, camera, x: barrel.x, y: barrel.y, z: ground + .95 * scale, width: .16 * scale, length: tank.archetype == 'artillery' ? 1.45 : 1.08, height: .15 * scale, heading: tank.turret, color: '#cbd6cd'})
        box({polygons, camera, x: tank.x, y: tank.y, z: ground + 1.06 * scale, width: .3 * scale, length: .3 * scale, height: .1 * scale, heading: tank.turret, color: '#33483c'})
    }
    function makeCamera(player) { const f = ahead(0, 0, player.heading, 1); return {x: player.x - f.x * 5.8, y: player.y - f.y * 5.8, z: 4.3, heading: player.heading, focal: 600, horizon: 255} }
    function box({polygons, camera, x, y, z, width, length, height, heading, color}) { const c = corners(x, y, width, length, heading); const bottom = c.map(function point(point) { return [...point, z - height / 2] }); const top = c.map(function point(point) { return [...point, z + height / 2] }); polygon({polygons, camera, points: top, color: shift(color, 18)}); for (let index = 0; index < 4; index += 1) polygon({polygons, camera, points: [bottom[index], bottom[(index + 1) % 4], top[(index + 1) % 4], top[index]], color: index % 2 ? color : shift(color, -15)}) }
    function pyramid({polygons, camera, x, y, z, radius, height, color}) { const b = [[x - radius, y - radius, z - height / 2], [x + radius, y - radius, z - height / 2], [x + radius, y + radius, z - height / 2], [x - radius, y + radius, z - height / 2]]; const p = [x, y, z + height / 2]; b.forEach(function point(point, index) { polygon({polygons, camera, points: [point, b[(index + 1) % 4], p], color: index % 2 ? color : shift(color, -15)}) }) }
    function addDiamond({polygons, camera, x, y, z, color, radius, alpha}) { const p = project(x, y, z, camera); if (p) polygons.push({depth: p.depth, color, alpha, points: [[p.x - radius, p.y], [p.x, p.y - radius], [p.x + radius, p.y], [p.x, p.y + radius]]}) }
    function polygon({polygons, camera, points, color}) { const projected = points.map(function point(point) { return project(...point, camera) }); if (!projected.some(function hidden(point) { return !point })) polygons.push({depth: projected.reduce(function total(sum, p) { return sum + p.depth }, 0) / projected.length, color, points: projected}) }
    function project(x, y, z, camera) { const dx = x - camera.x; const dy = y - camera.y; const forward = dx * Math.cos(camera.heading) + dy * Math.sin(camera.heading); if (forward < .3) return null; return {x: canvas.width / 2 + (-dx * Math.sin(camera.heading) + dy * Math.cos(camera.heading)) * camera.focal / forward, y: camera.horizon + (camera.z - z) * camera.focal / forward, depth: forward} }
    function draw(shape) { context.globalAlpha = shape.alpha ?? 1; context.fillStyle = shape.color; context.beginPath(); shape.points.forEach(function point(point, index) { index ? context.lineTo(point.x, point.y) : context.moveTo(point.x, point.y) }); context.closePath(); context.fill(); context.globalAlpha = 1 }
    function crosshair() { context.strokeStyle = '#ffffffcc'; context.beginPath(); context.arc(canvas.width / 2, canvas.height / 2, 8, 0, Math.PI * 2); context.stroke() }
    return {render}
}
function corners(x, y, width, length, heading) { const f = ahead(0, 0, heading, length / 2); const r = lateral(0, 0, heading, width / 2); return [[x - f.x - r.x, y - f.y - r.y], [x + f.x - r.x, y + f.y - r.y], [x + f.x + r.x, y + f.y + r.y], [x - f.x + r.x, y - f.y + r.y]] }
function ahead(x, y, heading, amount) { return {x: x + Math.cos(heading) * amount, y: y + Math.sin(heading) * amount} }
function lateral(x, y, heading, amount) { return {x: x - Math.sin(heading) * amount, y: y + Math.cos(heading) * amount} }
function distance(a, b) { return Math.hypot(a.x - b.x, a.y - b.y) }
function shift(color, amount) { const n = Number.parseInt(color.slice(1), 16); const c = function channel(offset) { return Math.max(0, Math.min(255, (n >> offset & 255) + amount)).toString(16).padStart(2, '0') }; return `#${c(16)}${c(8)}${c(0)}` }
