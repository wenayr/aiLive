import { createGame } from './game/create-game.mjs'
import { createRenderer } from './render/create-renderer.mjs'

const canvas = document.querySelector('#game')
const hud = document.querySelector('#hud')
const input = {forward: false, backward: false, left: false, right: false, turretLeft: false, turretRight: false, fire: false}
const controls = {w: 'forward', s: 'backward', a: 'left', d: 'right', q: 'turretLeft', e: 'turretRight', ' ': 'fire'}
const game = createGame()
const renderer = createRenderer({canvas})
let previous = performance.now()

window.addEventListener('keydown', function keyDown(event) {
    const key = event.key.toLowerCase()
    if (controls[key]) input[controls[key]] = true
    if (event.code == 'Space') event.preventDefault()
})
window.addEventListener('keyup', function keyUp(event) {
    const key = event.key.toLowerCase()
    if (controls[key]) input[controls[key]] = false
})

function frame(now) {
    const delta = Math.min((now - previous) / 1000, .04)
    previous = now
    game.runtime.update({delta, now, input})
    renderer.render(game.api.snapshot())
    const status = game.api.status()
    hud.textContent = status.playerAlive
        ? `Hull ${status.hp} · hostile tanks ${status.enemies} · generated round ${status.round} · arena seed: violet-arena`
        : 'Your tank was destroyed. Reload the page to restart.'
    requestAnimationFrame(frame)
}

requestAnimationFrame(frame)
