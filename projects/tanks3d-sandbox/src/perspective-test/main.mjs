import { createCoastalScenario } from './create-coastal-scenario.mjs'
import { createPerspectiveRenderer } from './create-perspective-renderer.mjs'

const canvas = document.querySelector('#game')
const hud = document.querySelector('#hud')
const scenario = createCoastalScenario()
const renderer = createPerspectiveRenderer({canvas})
const input = {forward: false, backward: false, left: false, right: false, fire: false, aim: null}
const controls = {w: 'forward', s: 'backward', a: 'left', d: 'right', ' ': 'fire'}
let previous = performance.now()
let paused = false

window.addEventListener('keydown', function keyDown(event) {
    const key = event.key.toLowerCase()
    if (controls[key]) input[controls[key]] = true
    if (event.code == 'Space') event.preventDefault()
    if (!event.repeat && key == 'p') paused = !paused
    if (!event.repeat && key == 'r') location.reload()
})
window.addEventListener('keyup', function keyUp(event) { const key = event.key.toLowerCase(); if (controls[key]) input[controls[key]] = false })
canvas.addEventListener('pointermove', function aim(event) {
    const bounds = canvas.getBoundingClientRect()
    const player = scenario.api.snapshot().player
    const angle = player.heading + ((event.clientX - bounds.left) / bounds.width - .5) * 1.8
    input.aim = {x: player.x + Math.cos(angle) * 12, y: player.y + Math.sin(angle) * 12}
})
function frame(now) {
    const delta = Math.min((now - previous) / 1000, .04)
    previous = now
    if (!paused) scenario.runtime.update({delta, now, input})
    renderer.render(scenario.api.snapshot())
    const status = scenario.api.status()
    hud.textContent = `${paused ? 'PAUSED · ' : ''}coastal world · hull ${status.hp} · enemies ${status.enemies} · living cover ${status.cover}`
    requestAnimationFrame(frame)
}
requestAnimationFrame(frame)
