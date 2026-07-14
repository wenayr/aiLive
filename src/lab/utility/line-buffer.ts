export function createLineBuffer() {
    let tail = ''

    function push(chunk: string) {
        const pieces = (tail + chunk).split(/\r?\n/)
        tail = pieces.pop() ?? ''
        return pieces
    }

    function flush() {
        if (!tail) return []
        const lines = [tail]
        tail = ''
        return lines
    }

    return {push, flush}
}
