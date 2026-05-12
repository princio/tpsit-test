/** @typedef {{ pid: string, start: number, end: number }} GanttSlice */

/**
 * @param {{ slices: GanttSlice[] }} props
 */
export default function GanttChart({ slices }) {
  if (!Array.isArray(slices) || slices.length === 0) return null
  return (
    <div className="gantt-chart">
      {slices.map((s, i) => {
        const duration = Math.max(0, (s.end ?? 0) - (s.start ?? 0))
        return (
          <div
            key={i}
            className="gantt-slice"
            style={{ flexGrow: duration || 1, flexBasis: 0 }}
          >
            <span className="gantt-pid">{s.pid}</span>
            <span className="gantt-start">{s.start}</span>
            <span className="gantt-end">{s.end}</span>
          </div>
        )
      })}
    </div>
  )
}
