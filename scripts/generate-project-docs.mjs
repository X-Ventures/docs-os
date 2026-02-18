#!/usr/bin/env node

/**
 * Docs OS — Project Ingestion Pipeline
 *
 * Scans a Google Drive folder, classifies files, converts them to MDX,
 * and generates a complete project data room.
 *
 * Usage:
 *   node scripts/generate-project-docs.mjs --drive="FOLDER_ID" --slug="project-name"
 *   node scripts/generate-project-docs.mjs --drive="FOLDER_ID" --slug="project-name" --visibility="investor"
 */

import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'

const args = Object.fromEntries(
  process.argv.slice(2).map(arg => {
    const [key, ...val] = arg.replace('--', '').split('=')
    return [key, val.join('=')]
  })
)

if (!args.drive || !args.slug) {
  console.error('Usage: generate-project-docs --drive="FOLDER_ID_OR_URL" --slug="project-name"')
  process.exit(1)
}

const DRIVE_ID = args.drive.includes('folders/')
  ? args.drive.split('folders/')[1].split('?')[0]
  : args.drive

const SLUG = args.slug.toLowerCase().replace(/[^a-z0-9-]/g, '-')
const VISIBILITY = args.visibility || 'investor'
const OUTPUT_BASE = path.resolve('content/projects', SLUG)
const DOCS_CONTENT = path.resolve('apps/docs-platform/src/content/projects', SLUG)

console.log(`\n📦 Docs OS — Ingestion Pipeline`)
console.log(`   Drive folder: ${DRIVE_ID}`)
console.log(`   Project slug: ${SLUG}`)
console.log(`   Visibility:   ${VISIBILITY}`)
console.log(`   Output:       ${OUTPUT_BASE}`)
console.log('')

// Step 1: Create directory structure
function setupDirectories() {
  console.log('1️⃣  Setting up directories...')
  for (const dir of [
    path.join(OUTPUT_BASE, 'raw'),
    path.join(OUTPUT_BASE, 'mdx'),
    path.join(OUTPUT_BASE, 'assets'),
    DOCS_CONTENT,
  ]) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

// Step 2: Scan Drive folder via Google Workspace MCP
// In production this calls the Drive API. For now we generate a manifest
// that can be filled by the MCP integration or manual export.
function scanDriveFolder() {
  console.log('2️⃣  Scanning Drive folder...')
  console.log('   → In automated mode, this calls Google Drive API')
  console.log('   → For manual mode, place exported files in content/projects/' + SLUG + '/raw/')

  const manifest = {
    folderId: DRIVE_ID,
    scannedAt: new Date().toISOString(),
    files: [],
    instructions: 'Place exported Google Drive files in the /raw directory. Supported: .docx, .pdf, .xlsx, .csv, .pptx, .md, .txt'
  }

  fs.writeFileSync(
    path.join(OUTPUT_BASE, 'drive-manifest.json'),
    JSON.stringify(manifest, null, 2)
  )

  return manifest
}

// Step 3: Classify files
function classifyFiles() {
  console.log('3️⃣  Classifying files...')
  const rawDir = path.join(OUTPUT_BASE, 'raw')
  if (!fs.existsSync(rawDir)) return []

  const files = fs.readdirSync(rawDir)
  return files.map(file => {
    const ext = path.extname(file).toLowerCase()
    let type = 'unknown'
    let category = 'appendix'

    if (['.md', '.mdx', '.txt'].includes(ext)) type = 'markdown'
    else if (['.docx', '.doc'].includes(ext)) type = 'document'
    else if (['.xlsx', '.xls', '.csv'].includes(ext)) type = 'spreadsheet'
    else if (['.pptx', '.ppt'].includes(ext)) type = 'presentation'
    else if (ext === '.pdf') type = 'pdf'
    else if (['.png', '.jpg', '.jpeg', '.svg', '.gif'].includes(ext)) type = 'image'

    const nameLower = file.toLowerCase()
    if (nameLower.includes('exec') || nameLower.includes('summary')) category = 'overview'
    else if (nameLower.includes('financial') || nameLower.includes('revenue')) category = 'financials'
    else if (nameLower.includes('team') || nameLower.includes('org')) category = 'team'
    else if (nameLower.includes('product') || nameLower.includes('roadmap')) category = 'product'
    else if (nameLower.includes('market') || nameLower.includes('competitor')) category = 'market'
    else if (nameLower.includes('legal') || nameLower.includes('term')) category = 'legal'
    else if (nameLower.includes('deck') || nameLower.includes('pitch')) category = 'pitch'

    return { file, ext, type, category }
  })
}

// Step 4: Generate metadata
function generateMetadata(classified) {
  console.log('4️⃣  Generating metadata...')
  const metadata = {
    slug: SLUG,
    name: SLUG.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
    visibility: VISIBILITY,
    status: 'active',
    tags: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    version: '1.0',
    fileCount: classified.length,
    categories: [...new Set(classified.map(f => f.category))],
    driveFolder: DRIVE_ID,
  }

  fs.writeFileSync(
    path.join(OUTPUT_BASE, 'metadata.json'),
    JSON.stringify(metadata, null, 2)
  )

  return metadata
}

// Step 5: Generate MDX pages
function generateMDXPages(metadata, classified) {
  console.log('5️⃣  Generating MDX pages...')

  // Index page
  const indexMdx = `---
title: "${metadata.name} — Data Room"
---

# ${metadata.name}

import { MetricCards } from '../../../components/MetricCards'

<MetricCards metrics={[
  { label: "Status", value: "${metadata.status}" },
  { label: "Visibility", value: "${metadata.visibility}" },
  { label: "Documents", value: "${metadata.fileCount}" },
  { label: "Version", value: "v${metadata.version}" }
]} />

---

## Documents

| Document | Category | Type |
|----------|----------|------|
${classified.map(f => `| ${f.file} | ${f.category} | ${f.type} |`).join('\n')}

---

> This data room was auto-generated by Docs OS on ${new Date().toISOString().split('T')[0]}.
> Source: Google Drive folder \`${DRIVE_ID}\`
`

  fs.writeFileSync(path.join(DOCS_CONTENT, 'index.mdx'), indexMdx)

  // _meta.ts for navigation
  const metaTs = `export default {
  index: 'Overview',
${classified
    .filter(f => f.type === 'markdown' || f.type === 'document')
    .map(f => {
      const slug = f.file.replace(/\.[^/.]+$/, '').toLowerCase().replace(/[^a-z0-9]+/g, '-')
      const name = f.file.replace(/\.[^/.]+$/, '')
      return `  '${slug}': '${name}',`
    })
    .join('\n')}
  appendix: 'Downloads & Appendix',
}
`
  fs.writeFileSync(path.join(DOCS_CONTENT, '_meta.ts'), metaTs)

  // Appendix page with download links
  const appendixMdx = `---
title: Downloads & Appendix
---

# Downloads & Appendix

All source files from the ${metadata.name} data room.

| File | Type | Category | Download |
|------|------|----------|----------|
${classified.map(f => `| ${f.file} | ${f.type} | ${f.category} | [Download](/projects/${SLUG}/assets/${f.file}) |`).join('\n')}

---

*Last synced: ${new Date().toISOString().split('T')[0]}*
`

  fs.writeFileSync(path.join(DOCS_CONTENT, 'appendix.mdx'), appendixMdx)
}

// Step 6: Generate changelog entry
function generateChangelog(metadata) {
  console.log('6️⃣  Generating changelog...')
  const changelogPath = path.join(DOCS_CONTENT, 'changelog.mdx')
  const entry = `---
title: Changelog
---

# Changelog — ${metadata.name}

## v${metadata.version} — ${new Date().toISOString().split('T')[0]}

- Initial data room generation
- ${metadata.fileCount} documents imported
- Categories: ${metadata.categories.join(', ')}
`

  fs.writeFileSync(changelogPath, entry)
}

// Execute pipeline
console.log('━'.repeat(50))
setupDirectories()
const manifest = scanDriveFolder()
const classified = classifyFiles()
const metadata = generateMetadata(classified)
generateMDXPages(metadata, classified)
generateChangelog(metadata)

console.log('')
console.log('━'.repeat(50))
console.log(`✅ Done! Project "${SLUG}" generated.`)
console.log('')
console.log('Next steps:')
console.log(`  1. Place exported Drive files in: ${path.join(OUTPUT_BASE, 'raw')}/`)
console.log(`  2. Re-run this script to update MDX pages`)
console.log(`  3. Run: npm run dev`)
console.log(`  4. Visit: http://localhost:3000/projects/${SLUG}`)
console.log('')
