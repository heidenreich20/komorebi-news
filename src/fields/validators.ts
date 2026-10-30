export const httpUrlOnly = (value: string | null | undefined): true | string => {
  if (!value) return true
  try {
    const { protocol } = new URL(value)
    return protocol === 'http:' || protocol === 'https:' || 'La URL debe usar http o https'
  } catch {
    return 'URL no válida'
  }
}
