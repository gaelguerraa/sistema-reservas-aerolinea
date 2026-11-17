import type { ReactNode } from 'react'

export interface DataColumn<Row> {
  key: string
  header: string
  render: (row: Row) => ReactNode
  isRowHeader?: boolean
}

export function DataTable<Row extends { id: string }>({ rows, columns, caption }: { rows: Row[]; columns: DataColumn<Row>[]; caption: string }) {
  return <div className="table-scroll" role="region" aria-label={caption} tabIndex={0}>
    <table className="data-table">
      <caption>{caption}</caption>
      <thead><tr>{columns.map((column) => <th key={column.key} scope="col">{column.header}</th>)}</tr></thead>
      <tbody>{rows.map((row) => <tr key={row.id}>{columns.map((column) => column.isRowHeader
        ? <th key={column.key} scope="row">{column.render(row)}</th>
        : <td key={column.key}>{column.render(row)}</td>)}</tr>)}</tbody>
    </table>
  </div>
}
