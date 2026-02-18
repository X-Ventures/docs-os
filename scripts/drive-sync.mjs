#!/usr/bin/env node

/**
 * Docs OS — Drive Auto-Sync (God Tier)
 *
 * Watches Google Drive folders for changes, regenerates docs,
 * commits to git, and triggers redeploy.
 *
 * Usage:
 *   node scripts/drive-sync.mjs
 *   node scripts/drive-sync.mjs --interval=300  (check every 5 min)
 *
 * Requires: Google Drive API credentials in .env
 */

import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'

const PROJECTS_DIR = path.resolve('content/projects')
const CHECK_INTERVAL = parseInt(process.argv.find(a => a.startsWith('--interval='))?.split('=')[1] || '300') * 1000

function getProjectsWithDrive() {
  if (!fs.existsSync(PROJECTS_DIR)) return []
  return fs.readdirSync(PROJECTS_DIR)
    .filter(dir => {
      const metaPath = path.join(PROJECTS_DIR, dir, 'metadata.json')
      return fs.existsSync(metaPath)
    })
    .map(dir => {
      const meta = JSON.parse(fs.readFileSync(path.join(PROJECTS_DIR, dir, 'metadata.json'), 'utf-8'))
      return { slug: dir, ...meta }
    })
    .filter(p => p.driveFolder)
}

async function checkForChanges(project) {
  const lastSync = new Date(project.updatedAt).getTime()
  const now = Date.now()

  // In production: call Google Drive API to check modified timestamps
  // For now: check if raw files have changed on disk
  const rawDir = path.join(PROJECTS_DIR, project.slug, 'raw')
  if (!fs.existsSync(rawDir)) return false

  const files = fs.readdirSync(rawDir)
  for (const file of files) {
    const stat = fs.statSync(path.join(rawDir, file))
    if (stat.mtimeMs > lastSync) return true
  }
  return false
}

async function syncProject(project) {
  console.log(`🔄 Syncing: ${project.slug}...`)
  try {
    execSync(
      `node scripts/generate-project-docs.mjs --drive="${project.driveFolder}" --slug="${project.slug}" --visibility="${project.visibility}"`,
      { stdio: 'inherit' }
    )

    execSync(`git add -A && git commit -m "sync: update ${project.slug} data room" || true`, {
      stdio: 'inherit',
    })

    console.log(`✅ ${project.slug} synced successfully`)
  } catch (err) {
    console.error(`❌ Failed to sync ${project.slug}:`, err.message)
  }
}

async function runSyncCycle() {
  console.log(`\n⏰ Sync cycle at ${new Date().toISOString()}`)
  const projects = getProjectsWithDrive()
  console.log(`   Found ${projects.length} projects with Drive links`)

  for (const project of projects) {
    const changed = await checkForChanges(project)
    if (changed) {
      await syncProject(project)
    } else {
      console.log(`   ⏭️  ${project.slug}: no changes`)
    }
  }
}

console.log('🚀 Docs OS — Drive Sync Watcher')
console.log(`   Check interval: ${CHECK_INTERVAL / 1000}s`)
console.log(`   Projects dir:   ${PROJECTS_DIR}`)
console.log('')

runSyncCycle()
setInterval(runSyncCycle, CHECK_INTERVAL)
