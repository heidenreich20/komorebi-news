const RESERVED_ROOT_SLUGS = new Set([
  'admin',
  'api',
  'autores',
  'buscar',
  'graphql',
  'graphql-playground',
  'login',
  'preview',
  'rss',
  'sobre-nosotros',
  'sitemap',
])

export const isReservedRootSlug = (slug: string): boolean => RESERVED_ROOT_SLUGS.has(slug)
