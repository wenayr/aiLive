import assert from 'node:assert/strict'
import test from 'node:test'
import { createLabService } from './create-lab-service'

test('service starts and lets Socket.IO own its shutdown', async () => {
    const service = createLabService({rootDirectory: process.cwd(), port: 0})
    await service.api.start()
    const update = service.api.arenaCoordinator.testing.advance()
    await service.api.stop()
    assert.equal(service.api.coordinator.testing.activeRuns(), 0)
    assert.equal(update.state.tick, 1)
})
