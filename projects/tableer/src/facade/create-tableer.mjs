import { filterRows } from '../filter/filter-rows.mjs'
import { createTable } from '../table/create-table.mjs'

export function createTableer({initialRows = []} = {}) {
    const table = createTable({initialRows})

    function load(rows) {
        table.control.replace(rows)
    }

    function search(query) {
        return filterRows({rows: table.api.read(), query})
    }

    return {
        control: {load},
        api: {search},
    }
}
