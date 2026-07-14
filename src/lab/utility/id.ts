import { randomUUID } from 'node:crypto'

export function createRunId() {
    return randomUUID()
}
