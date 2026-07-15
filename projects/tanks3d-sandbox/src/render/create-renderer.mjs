export function createRenderer({canvas}) {
    const context = canvas.getContext('2d')

    function render({arena, player, enemies, shells, effects, cores, blocks, camera = player}) {
        context.clearRect(0, 0, canvas.width, canvas.height)
        context.fillStyle = arena.palette.background
        context.fillRect(0, 0, canvas.width, canvas.height)
        const visible = visibleRange({arena, camera})
        for (let y = visible.startY; y < visible.endY; y += 1) for (let x = visible.startX; x < visible.endX; x += 1) drawTile({x, y, arena, camera})
        const visibleBlocks = blocks ?? arena.walls.map(function wall(item) { return {x: item[0] + .5, y: item[1] + .5, hp: 1, alive: true} })
        visibleBlocks.filter(function intact(block) { return block.alive }).forEach(function block(item) {
            drawBlock({x: item.x - .5, y: item.y - .5, arena, hp: item.hp, camera})
        })
        cores.filter(function available(core) { return !core.collected }).forEach(function core(item) { drawCore({core: item, arena, camera}) })
        shells.forEach(function shell(item) { drawOrb(item.x, item.y, camera) })
        effects.forEach(function effect(item) { drawEffect(item, camera) })
        const subjects = [...enemies, player].filter(function alive(item) { return item.alive }).sort(function depth(a, b) { return a.x + a.y - b.x - b.y })
        subjects.forEach(function tank(subject) {
            drawTank({subject, isPlayer: subject == player, camera})
        })
    }

    function visibleRange({arena, camera}) {
        return {
            startX: Math.max(0, Math.floor(camera.x - 15)),
            endX: Math.min(arena.size, Math.ceil(camera.x + 15)),
            startY: Math.max(0, Math.floor(camera.y - 15)),
            endY: Math.min(arena.size, Math.ceil(camera.y + 15)),
        }
    }
    function project(x, y, z = 0, camera) { return [480 + (x - camera.x - y + camera.y) * 30, 320 + (x - camera.x + y - camera.y) * 15 - z * 30] }
    function diamond(x, y, z, color, camera) {
        const points = [[x, y], [x + 1, y], [x + 1, y + 1], [x, y + 1]].map(function point(item) { return project(item[0], item[1], z, camera) })
        context.fillStyle = color
        context.beginPath()
        points.forEach(function point(item, index) { index ? context.lineTo(...item) : context.moveTo(...item) })
        context.closePath()
        context.fill()
    }
    function drawTile({x, y, arena, camera}) { diamond(x, y, 0, (x + y) % 2 ? arena.palette.tileA : arena.palette.tileB, camera) }
    function drawBlock({x, y, arena, hp, camera}) {
        diamond(x, y, .65, hp > 1 ? '#f6d08a' : arena.palette.wall, camera)
        diamond(x, y, .02, '#302c5c', camera)
    }
    function drawCore({core, arena, camera}) {
        const [x, y] = project(core.x, core.y, .7, camera)
        context.fillStyle = arena.palette.core
        context.beginPath()
        context.moveTo(x, y - 12)
        context.lineTo(x + 8, y)
        context.lineTo(x, y + 12)
        context.lineTo(x - 8, y)
        context.closePath()
        context.fill()
    }
    function drawOrb(x, y, camera) { const [sx, sy] = project(x, y, .45, camera); context.fillStyle = '#ffe8a0'; context.beginPath(); context.arc(sx, sy, 5, 0, Math.PI * 2); context.fill() }
    function drawEffect(effect, camera) { const [x, y] = project(effect.x, effect.y, .6, camera); context.fillStyle = effect.color; context.globalAlpha = Math.max(effect.life * 2, 0); context.beginPath(); context.arc(x, y, 22 * (1 - effect.life), 0, Math.PI * 2); context.fill(); context.globalAlpha = 1 }
    function drawTank({subject, isPlayer, camera}) {
        const {model} = subject
        const [x, y] = project(subject.x, subject.y, .15, camera)
        context.save()
        context.translate(x, y)
        context.rotate(screenAngle(subject.heading))
        context.fillStyle = '#0008'; context.fillRect(-model.bodyLength / 2, 9, model.bodyLength, model.trackWidth + 3)
        context.fillStyle = '#201d43'; context.fillRect(-model.bodyLength / 2, -model.bodyWidth / 2 - 2, model.bodyLength, model.trackWidth)
        context.fillRect(-model.bodyLength / 2, model.bodyWidth / 2 - model.trackWidth + 2, model.bodyLength, model.trackWidth)
        context.fillStyle = subject.color; context.fillRect(-model.bodyLength / 2 + 2, -model.bodyWidth / 2, model.bodyLength - 4, model.bodyWidth)
        context.rotate(screenAngle(subject.turret) - screenAngle(subject.heading))
        context.fillStyle = '#f3efff'; context.fillRect(0, -3, model.barrelLength, 6)
        context.fillStyle = subject.color; context.beginPath(); context.arc(0, 0, model.turretRadius, 0, Math.PI * 2); context.fill()
        context.restore()
        if (!isPlayer) {
            context.fillStyle = '#f3f6ff'
            context.font = '10px system-ui'
            context.fillText(subject.archetype, x - 12, y - 26)
        }
    }

    function screenAngle(angle) { return Math.atan2((Math.cos(angle) + Math.sin(angle)) * 15, (Math.cos(angle) - Math.sin(angle)) * 30) }

    return {render}
}
