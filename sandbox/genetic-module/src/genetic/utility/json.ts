export function copyJson<tValue>(value: tValue): tValue {
    return JSON.parse(JSON.stringify(value)) as tValue
}
