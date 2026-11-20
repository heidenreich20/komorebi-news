import 'dotenv/config'

import { getPayload } from 'payload'

import config from '../src/payload.config'

const categories = [
  { name: 'Política', slug: 'politica', description: 'Actualidad política y gestión pública.' },
  { name: 'Economía', slug: 'economia', description: 'Mercados, trabajo y actividad económica.' },
  { name: 'Tecnología', slug: 'tecnologia', description: 'Ciencia, tecnología e innovación.' },
  { name: 'Cultura', slug: 'cultura', description: 'Libros, cine, música y expresiones culturales.' },
]

const tags = [
  { name: 'Ciencia', slug: 'ciencia' },
  { name: 'Educación', slug: 'educacion' },
  { name: 'Industria', slug: 'industria' },
  { name: 'Innovación', slug: 'innovacion' },
]

const articleSeeds = [
  {
    title: 'Proyectos tecnológicos buscan acercar la ciencia a las escuelas',
    slug: 'proyectos-tecnologicos-acercan-ciencia-escuelas',
    excerpt: 'Iniciativas educativas exploran nuevas formas de conectar a estudiantes con la investigación y la tecnología.',
    bodyText: 'Distintas iniciativas educativas están incorporando herramientas tecnológicas para acercar la investigación científica a las aulas. El objetivo es generar experiencias prácticas y despertar el interés por la ciencia desde edades tempranas.',
    category: 'tecnologia',
    tags: ['ciencia', 'educacion', 'innovacion'],
  },
  {
    title: 'Pequeñas industrias analizan nuevas oportunidades de innovación',
    slug: 'pequenas-industrias-oportunidades-innovacion',
    excerpt: 'Empresas de menor escala evalúan procesos y herramientas para mejorar su productividad.',
    bodyText: 'La incorporación gradual de nuevas herramientas y procesos abre oportunidades para pequeñas industrias. Los principales desafíos siguen vinculados con la inversión, la capacitación y el acceso a tecnología.',
    category: 'economia',
    tags: ['industria', 'innovacion'],
  },
  {
    title: 'La agenda cultural suma propuestas para nuevos públicos',
    slug: 'agenda-cultural-nuevas-propuestas-publicos',
    excerpt: 'Espacios culturales y proyectos independientes exploran formatos para ampliar su alcance.',
    bodyText: 'Organizaciones culturales y proyectos independientes prueban nuevas propuestas para acercar sus actividades a públicos diversos. La programación combina formatos tradicionales con experiencias participativas.',
    category: 'cultura',
    tags: ['educacion'],
  },
]

const lexicalBody = (text: string) => ({
  root: {
    type: 'root',
    children: [
      {
        type: 'paragraph',
        children: [{ type: 'text', text, version: 1 }],
        direction: 'ltr',
        format: '',
        indent: 0,
        version: 1,
      },
    ],
    direction: 'ltr',
    format: '',
    indent: 0,
    version: 1,
  },
})

async function main() {
  const databaseURL = new URL(process.env.DATABASE_URL ?? '')
  const confirmedHost = process.env.SEED_SAMPLE_DATABASE_HOST

  if (
    process.env.NODE_ENV !== 'development' ||
    process.env.SEED_SAMPLE_DATA !== 'true' ||
    !confirmedHost ||
    confirmedHost !== databaseURL.hostname
  ) {
    throw new Error(
      'Sample seeding requires NODE_ENV=development, SEED_SAMPLE_DATA=true, and SEED_SAMPLE_DATABASE_HOST matching DATABASE_URL.',
    )
  }

  const payload = await getPayload({ config: await config })

  try {
    const categoryIds = new Map<string, number>()
    for (const category of categories) {
      const existing = await payload.find({
        collection: 'categories',
        where: { slug: { equals: category.slug } },
        limit: 1,
        depth: 0,
        overrideAccess: true,
      })
      const doc =
        existing.docs[0] ??
        (await payload.create({
          collection: 'categories',
          data: category,
          overrideAccess: true,
          depth: 0,
        }))
      categoryIds.set(category.slug, doc.id)
    }

    const tagIds = new Map<string, number>()
    for (const tag of tags) {
      const existing = await payload.find({
        collection: 'tags',
        where: { slug: { equals: tag.slug } },
        limit: 1,
        depth: 0,
        overrideAccess: true,
      })
      const doc =
        existing.docs[0] ??
        (await payload.create({
          collection: 'tags',
          data: tag,
          overrideAccess: true,
          depth: 0,
        }))
      tagIds.set(tag.slug, doc.id)
    }

    const authorResult = await payload.find({
      collection: 'authors',
      where: { slug: { equals: 'redaccion' } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
    const author =
      authorResult.docs[0] ??
      (await payload.create({
        collection: 'authors',
        data: { displayName: 'Redacción', slug: 'redaccion', biography: 'Perfil editorial de ejemplo.' },
        overrideAccess: true,
        depth: 0,
      }))

    let createdArticles = 0
    for (const article of articleSeeds) {
      const existing = await payload.find({
        collection: 'articles',
        where: { slug: { equals: article.slug } },
        limit: 1,
        depth: 0,
        overrideAccess: true,
      })
      if (existing.totalDocs > 0) continue

      await payload.create({
        collection: 'articles',
        data: {
          title: article.title,
          slug: article.slug,
          excerpt: article.excerpt,
          body: lexicalBody(article.bodyText),
          categories: [categoryIds.get(article.category)!],
          tags: article.tags.map((tag) => tagIds.get(tag)!),
          author: author.id,
          editorialStatus: 'draft',
          isFeatured: false,
        },
        overrideAccess: true,
        depth: 0,
      })
      createdArticles += 1
    }

    payload.logger.info(
      `Sample content ready. Categories: ${categories.length}, tags: ${tags.length}, articles created: ${createdArticles}.`,
    )
  } finally {
    await payload.destroy()
  }
}

void main().catch((error: unknown) => {
  console.error(error)
  process.exitCode = 1
})
