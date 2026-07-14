export function copyJson<T>(value: T) {
    return JSON.parse(JSON.stringify(value)) as T
}
