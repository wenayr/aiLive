let tick = 0
const timer = setInterval(function reportProgress() {
    tick += 1
    console.log(`tick=${tick}`)
    if (tick < 20) return
    clearInterval(timer)
    console.log('wait fixture completed')
}, 500)
