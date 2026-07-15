import { createFieldTest } from './create-field-test.mjs'
import { createRenderer } from '../render/create-renderer.mjs'

const canvas = document.querySelector('#game')
const hud = document.querySelector('#hud')
const mapPicker = document.querySelector('#map')
const mapKind = new URLSearchParams(location.search).get('map') ?? 'crossroads'
const input = {forward: false, backward: false, left: false, right: false, fire: false, aim: null}
const controls = {w: 'forward', s: 'backward', a: 'left', d: 'right', ' ': 'fire'}
const field = createFieldTest({mapKind})
const renderer = createRenderer({canvas})
let previous = performance.now()
let paused = false
const camera = {x: field.api.snapshot().player.x, y: field.api.snapshot().player.y}

mapPicker.value = mapKind
mapPicker.addEventListener('change', function changeMap() {
    const url = new URL(location.href)
    url.searchParams.set('map', mapPicker.value)
    location.assign(url)
})

window.addEventListener('keydown', function keyDown(event) {
    const key = event.key.toLowerCase()
    if (controls[key]) input[controls[key]] = true
    if (event.code == 'Space') event.preventDefault()
    if (!event.repeat && key == 'p') paused = !paused
    if (!event.repeat && key == 'r') location.reload()
})
window.addEventListener('keyup', function keyUp(event) {
    const key = event.key.toLowerCase()
    if (controls[key]) input[controls[key]] = false
})
canvas.addEventListener('pointermove', function aimTurret(event) {
    const bounds = canvas.getBoundingClientRect()
    input.aim = unproject(
        (event.clientX - bounds.left) * canvas.width / bounds.width,
        (event.clientY - bounds.top) * canvas.height / bounds.height,
    )
})

function frame(now) {
    const delta = Math.min((now - previous) / 1000, .04)
    previous = now
    if (!paused) field.runtime.update({delta, now, input})
    const snapshot = field.api.snapshot()
    camera.x += (snapshot.player.x - camera.x) * Math.min(delta * 8, 1)
    camera.y += (snapshot.player.y - camera.y) * Math.min(delta * 8, 1)
    renderer.render({...snapshot, camera})
    const status = field.api.status()
    hud.textContent = `${paused ? 'PAUSED · ' : ''}${status.mapKind} · 130×130 · hull ${status.hp} · enemies ${status.enemies} · objects ${status.objects} · destroyed ${status.destroyed}`
    requestAnimationFrame(frame)
}

function unproject(screenX, screenY) {
    const difference = (screenX - 480) / 30
    const sum = (screenY - 320) / 15
    return {x: camera.x + (sum + difference) / 2, y: camera.y + (sum - difference) / 2}
}

requestAnimationFrame(frame)
