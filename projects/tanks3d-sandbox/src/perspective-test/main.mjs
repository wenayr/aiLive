import { createFieldTest } from '../field-test/create-field-test.mjs'
import { createPerspectiveRenderer } from './create-perspective-renderer.mjs'
import { createScenery } from '../generators/create-scenery.mjs'

const canvas = document.querySelector('#game')
const hud = document.querySelector('#hud')
const mapPicker = document.querySelector('#map')
const mapKind = new URLSearchParams(location.search).get('map') ?? 'canyon'
const input = {forward: false, backward: false, left: false, right: false, fire: false, aim: null}
const controls = {w: 'forward', s: 'backward', a: 'left', d: 'right', ' ': 'fire'}
const field = createFieldTest({mapKind})
const renderer = createPerspectiveRenderer({canvas})
const scenery = createScenery({seed: 'open-art-direction', kind: mapKind, size: 130})
let previous = performance.now()
let paused = false

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
window.addEventListener('keyup', function keyUp(event) { const key = event.key.toLowerCase(); if (controls[key]) input[controls[key]] = false })
canvas.addEventListener('pointermove', function aimTurret(event) {
    const bounds = canvas.getBoundingClientRect()
    const ratio = (event.clientX - bounds.left) / bounds.width - .5
    const player = field.api.snapshot().player
    const angle = player.heading + ratio * 1.8
    input.aim = {x: player.x + Math.cos(angle) * 10, y: player.y + Math.sin(angle) * 10}
})

function frame(now) {
    const delta = Math.min((now - previous) / 1000, .04)
    previous = now
    if (!paused) field.runtime.update({delta, now, input})
    const snapshot = field.api.snapshot()
    renderer.render({...snapshot, scenery})
    const status = field.api.status()
    hud.textContent = `${paused ? 'PAUSED · ' : ''}${status.mapKind} · wildland 3D · hull ${status.hp} · enemies ${status.enemies} · objects ${status.objects} · destroyed ${status.destroyed}`
    requestAnimationFrame(frame)
}

requestAnimationFrame(frame)
