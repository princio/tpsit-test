function apiKey(test) {
  return `${test.title ?? ''}:${test.classe ?? ''}:${test.uda ?? ''}`
}

export function storageKey(test) {
  return `excel-grid:${apiKey(test)}`
}

export async function fetchSession(test) {
  const res = await fetch(`/api/griglia?key=${encodeURIComponent(apiKey(test))}`)
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function putSession(test, students, weights) {
  const res = await fetch(`/api/griglia?key=${encodeURIComponent(apiKey(test))}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ students, weights }),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}
