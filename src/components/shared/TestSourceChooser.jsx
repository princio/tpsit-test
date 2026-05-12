import FilePicker from './FilePicker'
import Library from './Library'

/**
 * Side-by-side: server library (left) + local file upload (right).
 * Either side calls `onTestLoaded(testData)` when a test is picked.
 *
 * @param {{ onTestLoaded: (test: any) => void }} props
 */
export default function TestSourceChooser({ onTestLoaded }) {
  return (
    <div className="test-source-chooser">
      <div className="test-source-library">
        <Library onTestLoaded={onTestLoaded} />
      </div>
      <div className="test-source-upload">
        <FilePicker onTestLoaded={onTestLoaded} />
      </div>
    </div>
  )
}
