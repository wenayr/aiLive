import { useEffect } from 'react'
import {
    createToolbar,
    ModalProvider,
    useModal,
    useUpdateByApi,
} from 'wenay-react2'
import type { tRunRecord, tTaskDefinition } from '../../contracts/lab-contracts'
import { createArenaClient } from './arena-client'
import { createLabClient } from './lab-client'
import { createProjectTransport } from './project-transport'
import './lab.css'

const transport = createProjectTransport({})
const client = createLabClient({transport})
const arenaClient = createArenaClient({transport})

const toolbar = createToolbar({
    key: 'ai-live.l0.toolbar',
    items: [
        {
            key: 'refresh',
            title: 'Refresh state',
            short: 'Refresh',
            icon: '↻',
            onClick: function refreshLab() { void client.api.refresh() },
        },
        {
            key: 'reconnect',
            title: 'Reconnect transport',
            short: 'Reconnect',
            icon: '↯',
            onClick: function reconnectLab() { void client.api.connect() },
        },
    ],
})

function labelStatus(status: tRunRecord['status']) {
    return status.replaceAll('_', ' ')
}

function isActive(run: tRunRecord) {
    return run.status == 'queued' || run.status == 'starting' || run.status == 'running'
}

function RunInspector(props: {runId: string}) {
    const modal = useModal()
    useUpdateByApi(client.state)
    const run = client.state.snapshot?.runs.find(function findRun(item) { return item.id == props.runId })

    if (!run) return null
    return <section className='lab-inspector' aria-label={`Run ${run.id}`}>
        <header className='lab-inspector-header'>
            <div>
                <p className='lab-kicker'>Run inspector</p>
                <h2>{run.task.title}</h2>
                <p className='lab-muted'>{run.id}</p>
            </div>
            <button className='lab-button lab-button-quiet' onClick={modal.close}>Close</button>
        </header>

        <dl className='lab-detail-grid'>
            <div><dt>Status</dt><dd><StatusBadge status={run.status}/></dd></div>
            <div><dt>Created</dt><dd>{new Date(run.createdAt).toLocaleString()}</dd></div>
            <div><dt>Started</dt><dd>{run.startedAt ? new Date(run.startedAt).toLocaleString() : '—'}</dd></div>
            <div><dt>Finished</dt><dd>{run.finishedAt ? new Date(run.finishedAt).toLocaleString() : '—'}</dd></div>
            <div><dt>Exit</dt><dd>{run.exitCode ?? '—'}</dd></div>
            <div><dt>Signal</dt><dd>{run.signal ?? '—'}</dd></div>
        </dl>

        {run.reason && <p className='lab-reason'>{run.reason}</p>}

        <h3>Live trace ({run.eventCount})</h3>
        <pre className='lab-log'>{run.logTail.length
            ? run.logTail.map(function line(log) { return `[${log.stream}] ${log.text}` }).join('\n')
            : 'Waiting for process output…'}</pre>

        <h3>Artifacts</h3>
        {run.artifacts.length
            ? <ul className='lab-artifacts'>{run.artifacts.map(function artifact(item) {
                return <li key={item.path}>{item.path} · {item.bytes} B · {item.mediaType}</li>
            })}</ul>
            : <p className='lab-muted'>No artifact has been produced.</p>}
    </section>
}

function StatusBadge(props: {status: tRunRecord['status']}) {
    return <span className={`lab-status lab-status-${props.status}`}>{labelStatus(props.status)}</span>
}

function TaskCard(props: {task: tTaskDefinition}) {
    return <article className='lab-task-card'>
        <div className='lab-task-card-top'>
            <span className='lab-task-kind'>{props.task.kind}</span>
            <span className='lab-muted'>v{props.task.version}</span>
        </div>
        <h3>{props.task.title}</h3>
        <p>{props.task.summary}</p>
        <dl className='lab-task-meta'>
            <div><dt>Timeout</dt><dd>{props.task.timeoutMs} ms</dd></div>
            <div><dt>Capabilities</dt><dd>{props.task.capabilities.join(', ')}</dd></div>
        </dl>
        <button className='lab-button' onClick={function runTask() { void client.api.startTask(props.task.id) }}>
            Run task
        </button>
    </article>
}

function RunTable() {
    const modal = useModal()
    const runs = client.state.snapshot?.runs ?? []
    if (!runs.length) return <p className='lab-empty'>No task has run yet.</p>

    return <div className='lab-table-wrap'>
        <table className='lab-table'>
            <thead>
                <tr><th>Task</th><th>Status</th><th>Created</th><th>Events</th><th>Action</th></tr>
            </thead>
            <tbody>
                {runs.map(function runRow(run) {
                    return <tr key={run.id}>
                        <td><strong>{run.task.title}</strong><br/><span className='lab-muted'>{run.id.slice(0, 8)}</span></td>
                        <td><StatusBadge status={run.status}/></td>
                        <td>{new Date(run.createdAt).toLocaleTimeString()}</td>
                        <td>{run.eventCount}</td>
                        <td className='lab-row-actions'>
                            <button className='lab-link-button' onClick={function inspectRun() {
                                modal.open(<RunInspector runId={run.id}/>)
                            }}>Inspect</button>
                            {isActive(run) && <button className='lab-link-button lab-danger' onClick={function cancelRun() {
                                void client.api.cancelRun(run.id)
                            }}>Cancel</button>}
                        </td>
                    </tr>
                })}
            </tbody>
        </table>
    </div>
}

function ArenaPanel() {
    useUpdateByApi(arenaClient.state)
    const state = arenaClient.state
    const snapshot = state.snapshot

    return <section className='lab-section' aria-label='Realtime Simulation Lab'>
        <div className='lab-section-heading'>
            <div><p className='lab-kicker'>L1 · Runtime + debug consumer</p><h2>Networked Tank Arena</h2></div>
            <div className={`lab-connection lab-connection-${state.connection}`}><span className='lab-connection-dot'/>{state.connection}</div>
        </div>
        {state.error && <p className='lab-alert'>{state.error}</p>}
        <div className='arena-overview'>
            <div><span>Authoritative tick</span><strong>{snapshot?.tick ?? '—'}</strong></div>
            <div><span>Tick interval</span><strong>{state.metrics ? `${state.metrics.tickMs} ms` : '—'}</strong></div>
            <div><span>State hash</span><strong>{state.metrics?.stateHash ?? '—'}</strong></div>
            <div><span>Last events</span><strong>{state.lastUpdate?.events.map(function kind(event) { return event.kind }).join(', ') || '—'}</strong></div>
        </div>
        <div className='arena-tanks'>
            {(snapshot?.tanks ?? []).map(function tank(tank) {
                return <article key={tank.id} className='arena-tank'>
                    <div><strong>{tank.id}</strong><span>{tank.team}</span></div>
                    <p>HP {tank.hp} · {tank.alive ? 'active' : 'destroyed'} · ({tank.position.x}, {tank.position.y})</p>
                    <button className='lab-button' disabled={!tank.alive || state.connection != 'live'} onClick={function fire() {
                        void arenaClient.api.fire(tank.id)
                    }}>Queue fire</button>
                </article>
            })}
        </div>
    </section>
}

function LabShell() {
    useUpdateByApi(client.state)
    const state = client.state
    const snapshot = state.snapshot

    useEffect(function connectOnMount() {
        void client.api.connect()
        void arenaClient.api.connect()
        return function disconnectOnUnmount() {
            client.control.disconnect()
            arenaClient.control.disconnect()
        }
    }, [])

    return <main className='lab-page'>
        <header className='lab-header'>
            <div>
                <p className='lab-kicker'>AI Live · L0</p>
                <h1>Observable local laboratory</h1>
                <p className='lab-subtitle'>Registered tasks run locally; the panel observes state, trace and artifacts.</p>
            </div>
            <div className={`lab-connection lab-connection-${state.connection}`}>
                <span className='lab-connection-dot'/>
                {state.connection}
            </div>
        </header>

        <toolbar.Bar settings reset/>

        {state.error && <p className='lab-alert'>{state.error}</p>}

        <section className='lab-notice'>
            <strong>Boundary:</strong> this is a guarded local runner, not a Docker/VM security sandbox. It runs only registered Node tasks and accepts no browser-provided shell command.
        </section>

        <section className='lab-overview' aria-label='Laboratory state'>
            <div><span>Executor</span><strong>{snapshot?.health.executor ?? 'connecting'}</strong></div>
            <div><span>Active runs</span><strong>{snapshot?.health.activeRuns ?? '—'}</strong></div>
            <div><span>Tasks</span><strong>{snapshot?.tasks.length ?? '—'}</strong></div>
            <div><span>Sandbox</span><strong>{snapshot?.health.sandbox ?? '—'}</strong></div>
        </section>

        <section className='lab-section'>
            <div className='lab-section-heading'><div><p className='lab-kicker'>Registry</p><h2>Tasks</h2></div></div>
            {snapshot
                ? <div className='lab-task-grid'>{snapshot.tasks.map(function taskCard(task) {
                    return <TaskCard key={task.id} task={task}/>
                })}</div>
                : <p className='lab-empty'>Connecting to the local service…</p>}
        </section>

        <ArenaPanel/>

        <section className='lab-section'>
            <div className='lab-section-heading'><div><p className='lab-kicker'>Evidence</p><h2>Recent runs</h2></div></div>
            <RunTable/>
        </section>
    </main>
}

export function LabApp() {
    return <ModalProvider><LabShell/></ModalProvider>
}
