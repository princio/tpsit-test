import Library from './shared/Library'
import FilePicker from './shared/FilePicker'

/**
 * Landing page. The library tree is the primary way in; local upload is
 * offered as a secondary option below.
 *
 * @param {{ onTestLoaded: (test: any) => void }} props
 */
export default function HomePage({ onTestLoaded }) {
  return (
    <div className="home-page">
      <header className="home-header">
        <h1>TPSIT — Test</h1>
        <p className="home-subtitle">
          Seleziona un test dalla libreria oppure carica un file locale.
        </p>
      </header>

      <section className="home-library">
        <Library onTestLoaded={onTestLoaded} title="Libreria" />
      </section>

      <section className="home-upload">
        <h3 className="home-upload-title">…oppure carica un file JSON locale</h3>
        <FilePicker onTestLoaded={onTestLoaded} />
      </section>
    </div>
  )
}
