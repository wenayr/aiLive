export function createTable({initialRows = []} = {}) {
    let rows = normalizeRows(initialRows)

    function replace(nextRows) {
        rows = normalizeRows(nextRows)
    }

    function read() {
        return rows.map(copyRow)
    }

    return {
        control: {replace},
        api: {read},
    }
}

function normalizeRows(rows) {
    if (!Array.isArray(rows)) throw new Error('Table rows must be an array')
    const ids = new Set()
    return rows.map(function normalize(row) {
        if (typeof row != 'object' || row == null || Array.isArray(row)) {
            throw new Error('Each table row must be an object')
        }
        if (typeof row.id != 'string' || !row.id.trim()) {
            throw new Error('Each table row needs a non-empty string id')
        }
        if (ids.has(row.id)) throw new Error(`Duplicate table row id: ${row.id}`)
        ids.add(row.id)
        return copyRow(row)
    })
}

function copyRow(row) {
    return {...row}
}
