export function createRenderer({canvas}) {
    const context = canvas.getContext('2d')

    function render({arena, player, enemies, shells}) {
        context.clearRect(0, 0, canvas.width, canvas.height)
        context.fillStyle = '#10102a'
        context.fillRect(0, 0, canvas.width, canvas.height)
        for (let y = 0; y < arena.size; y += 1) for (let x = 0; x < arena.size; x += 1) drawTile(x, y)
        arena.walls.forEach(function wall(item) { drawBlock(item[0], item[1]) })
        shells.forEach(function shell(item) { drawOrb(item.x, item.y) })
        ;[...enemies, player].filter(function alive(item) { return item.alive }).sort(function depth(a, b) { return a.x + a.y - b.x - b.y }).forEach(drawTank)
    }

    function project(x, y, z = 0) { return [480 + (x - y) * 30, 84 + (x + y) * 15 - z * 30] }
    function diamond(x, y, z, color) {
        const points = [[x, y], [x + 1, y], [x + 1, y + 1], [x, y + 1]].map(function point(item) { return project(item[0], item[1], z) })
        context.fillStyle = color
        context.beginPath()
        points.forEach(function point(item, index) { index ? context.lineTo(...item) : context.moveTo(...item) })
        context.closePath()
        context.fill()
    }
    function drawTile(x, y) { diamond(x, y, 0, (x + y) % 2 ? '#22214c' : '#29275b') }
    function drawBlock(x, y) { diamond(x, y, .65, '#59508b'); diamond(x, y, .02, '#302c5c') }
    function drawOrb(x, y) { const [sx, sy] = project(x, y, .45); context.fillStyle = '#ffe8a0'; context.beginPath(); context.arc(sx, sy, 5, 0, Math.PI * 2); context.fill() }
    function drawTank(subject) {
        const [x, y] = project(subject.x, subject.y, .15)
        context.save()
        context.translate(x, y)
        context.rotate(subject.heading + Math.PI / 4)
        context.fillStyle = '#0008'; context.fillRect(-18, 9, 36, 9)
        context.fillStyle = subject.color; context.fillRect(-17, -10, 34, 20)
        context.fillStyle = '#201d43'; context.fillRect(-18, 10, 36, 5)
        context.rotate(subject.turret - subject.heading)
        context.fillStyle = '#f3efff'; context.fillRect(-3, -26, 6, 26)
        context.fillStyle = subject.color; context.beginPath(); context.arc(0, 0, 10, 0, Math.PI * 2); context.fill()
        context.restore()
    }

    return {render}
}
