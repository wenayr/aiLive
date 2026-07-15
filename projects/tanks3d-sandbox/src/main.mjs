import { createGame } from './game/create-game.mjs'
import { createRenderer } from './render/create-renderer.mjs'

const canvas = document.querySelector('#game')
const hud = document.querySelector('#hud')
const mapPicker = document.querySelector('#map')
const mapKind = new URLSearchParams(location.search).get('map') ?? 'crossroads'
const input = {forward: false, backward: false, left: false, right: false, turretLeft: false, turretRight: false, fire: false, aim: null}
const controls = {w: 'forward', s: 'backward', a: 'left', d: 'right', q: 'turretLeft', e: 'turretRight', ' ': 'fire'}
const game = createGame({mapKind})
const renderer = createRenderer({canvas})
let previous = performance.now()

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
    game.runtime.update({delta, now, input})
    renderer.render(game.api.snapshot())
    const status = game.api.status()
    hud.textContent = status.playerAlive
        ? `Hull ${status.hp} · hostile tanks ${status.enemies} · ${status.mapKind} · generated round ${status.round} · arena seed: violet-arena`
        : 'Your tank was destroyed. Reload the page to restart.'
    requestAnimationFrame(frame)
}

requestAnimationFrame(frame)

function unproject(screenX, screenY) {
    const difference = (screenX - 480) / 30
    const sum = (screenY - 84) / 15
    return {x: (sum + difference) / 2, y: (sum - difference) / 2}
}
