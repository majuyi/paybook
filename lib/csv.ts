type Cell = string | number | boolean | null | undefined

function escape(value: Cell): string {
  if (value === null || value === undefined) return ''
  const s = typeof value === 'boolean' ? (value ? 'true' : 'false') : String(value)
  // Quote if the value contains a comma, quote, or newline.
  if (/[",\n\r]/.test(s)) {
    return '"' + s.replace(/"/g, '""') + '"'
  }
  return s
}

/**
 * Builds a CSV string from a header row and objects. Column order follows
 * `headers`; each header maps to a key in the row objects.
 */
export function toCsv(
  headers: string[],
  rows: Record<string, Cell>[],
): string {
  const lines = [headers.map(escape).join(',')]
  for (const row of rows) {
    lines.push(headers.map((h) => escape(row[h])).join(','))
  }
  return lines.join('\n')
}
