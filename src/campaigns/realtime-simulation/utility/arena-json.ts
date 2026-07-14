export function copyArenaJson<T>(value: T) {
    return JSON.parse(JSON.stringify(value)) as T
}

export function pointKey(point: {x: number, y: number}) {
    return `${point.x},${point.y}`
}

export function comparePoints(a: {x: number, y: number}, b: {x: number, y: number}) {
    return a.y - b.y || a.x - b.x
}
