/** Thin wrappers around the NestJS backend (see /server). */

/**
 * @typedef {Object} TestSummary
 * @property {number} id
 * @property {string} filePath
 * @property {string} classe
 * @property {string} materia
 * @property {string} uda
 * @property {string} title
 * @property {number | null} latestVersionId
 * @property {number | null} latestValidVersionId
 * @property {boolean | null} currentlyValid
 * @property {string | null} latestErrors
 */

async function jsonOrThrow(res) {
  if (!res.ok) {
    let detail = ''
    try {
      const body = await res.json()
      detail = body.message || JSON.stringify(body)
    } catch {
      detail = await res.text()
    }
    throw new Error(`HTTP ${res.status}: ${detail || res.statusText}`)
  }
  return res.json()
}

/** @returns {Promise<TestSummary[]>} */
export async function listTests() {
  const res = await fetch('/api/tests')
  return jsonOrThrow(res)
}

/**
 * Load latest valid version of a test. Returns the parsed TestData
 * with extra backend metadata fields (`id`, `versionId`, `filePath`, ...).
 */
export async function loadTest(id) {
  const res = await fetch(`/api/tests/${id}`)
  return jsonOrThrow(res)
}

export async function listVersions(id) {
  const res = await fetch(`/api/tests/${id}/versions`)
  return jsonOrThrow(res)
}

export async function loadVersion(versionId) {
  const res = await fetch(`/api/versions/${versionId}`)
  return jsonOrThrow(res)
}

export async function triggerSync() {
  const res = await fetch('/api/sync', { method: 'POST' })
  return jsonOrThrow(res)
}

/**
 * Overwrite the JSON file on disk for the test with id `id`. The backend
 * validates the body and captures a new version. Throws on 4xx/5xx.
 */
export async function saveTestFile(id, data) {
  const res = await fetch(`/api/tests/${id}/file`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  return jsonOrThrow(res)
}

/**
 * Save a new version of the test in the database only — does NOT touch
 * the canonical file on disk. Backend dedupes by content hash.
 */
export async function saveTestVersion(id, data) {
  const res = await fetch(`/api/tests/${id}/versions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  return jsonOrThrow(res)
}
