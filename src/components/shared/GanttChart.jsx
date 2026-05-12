/** @typedef {{ pid: string, duration: number }} GanttSlice */

/**
 * Normalize a slice to `{ pid, duration }`. Accepts legacy
 * `{ pid, start, end }` shape for backward compatibility with older JSONs.
 */
function sliceDuration(s) {
  if (typeof s?.duration === 'number') return Math.max(0, s.duration)
  if (typeof s?.start === 'number' && typeof s?.end === 'number') {
    return Math.max(0, s.end - s.start)
  }
  return 0
}

/**
 * @param {{ slices: GanttSlice[] }} props
 */
export default function GanttChart({ slices }) {
  if (!Array.isArray(slices) || slices.length === 0) return null
  let cursor = 0
  return (
    <div className="gantt-chart">
      {slices.map((s, i) => {
        const duration = sliceDuration(s)
        const start = cursor
        const end = cursor + duration
        cursor = end
        return (
          <div
            key={i}
            className="gantt-slice"
            style={{ flexGrow: duration || 1, flexBasis: 0 }}
          >
            <span className="gantt-pid">{s.pid}</span>
            <span className="gantt-start">{start}</span>
            <span className="gantt-end">{end}</span>
          </div>
        )
      })}
    </div>
  )
}
