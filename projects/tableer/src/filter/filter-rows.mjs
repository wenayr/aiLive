export function filterRows({rows, query}) {
    const normalizedQuery = String(query ?? '').trim().toLocaleLowerCase()
    if (!normalizedQuery) return rows.map(copyRow)
    return rows.filter(function matches(row) {
        return Object.values(row).some(function contains(value) {
            return String(value).toLocaleLowerCase().includes(normalizedQuery)
        })
    }).map(copyRow)
}

function copyRow(row) {
    return {...row}
}
