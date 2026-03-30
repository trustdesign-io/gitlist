#!/usr/bin/env node
/**
 * Release script — bumps version, updates app.json, generates changelog, tags.
 *
 * Usage:
 *   node scripts/release.mjs patch   → 1.0.0 → 1.0.1
 *   node scripts/release.mjs minor   → 1.0.0 → 1.1.0
 *   node scripts/release.mjs major   → 1.0.0 → 2.0.0
 */
import { execSync } from 'child_process'
import { readFileSync, writeFileSync } from 'fs'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function run(cmd) {
  return execSync(cmd, { encoding: 'utf8' }).trim()
}

function bumpVersion(current, type) {
  const [major, minor, patch] = current.split('.').map(Number)
  switch (type) {
    case 'major': return `${major + 1}.0.0`
    case 'minor': return `${major}.${minor + 1}.0`
    case 'patch': return `${major}.${minor}.${patch + 1}`
    default: throw new Error(`Unknown release type: ${type}. Use patch | minor | major`)
  }
}

function parseChangelog(commits) {
  const sections = { feat: [], fix: [], docs: [], refactor: [], chore: [], perf: [] }
  const headings = {
    feat: '### Added',
    fix: '### Fixed',
    perf: '### Performance',
    refactor: '### Changed',
    docs: '### Documentation',
    chore: '### Chores',
  }

  for (const line of commits) {
    const m = line.match(/^(feat|fix|docs|refactor|chore|perf|test|style|build|ci)(\([^)]*\))?!?:\s*(.+)/)
    if (m) {
      const [, type, , description] = m
      const bucket = sections[type] ?? sections.chore
      bucket.push(`- ${description}`)
    }
  }

  const body = Object.entries(headings)
    .filter(([key]) => sections[key].length > 0)
    .map(([key, heading]) => `${heading}\n\n${sections[key].join('\n')}`)
    .join('\n\n')

  return body
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const type = process.argv[2]
if (!['patch', 'minor', 'major'].includes(type)) {
  console.error('Usage: node scripts/release.mjs <patch|minor|major>')
  process.exit(1)
}

// Guard: working tree must be clean before we create a release commit
const dirty = run('git status --porcelain')
if (dirty) {
  console.error('Working tree is not clean. Commit or stash changes before releasing.')
  console.error(dirty)
  process.exit(1)
}

// Read current versions
const pkg = JSON.parse(readFileSync('package.json', 'utf8'))
const appJson = JSON.parse(readFileSync('app.json', 'utf8'))

const currentVersion = pkg.version
const newVersion = bumpVersion(currentVersion, type)

console.log(`\nReleasing ${currentVersion} → ${newVersion} (${type})\n`)

// Get commits since last tag (or all commits if no tags)
let lastTag = ''
try {
  lastTag = run('git describe --tags --abbrev=0')
} catch {
  // No tags yet — use root commit
  lastTag = run('git rev-list --max-parents=0 HEAD')
}

const commitRange = `${lastTag}..HEAD`
const rawCommits = run(`git log --pretty=format:"%s" ${commitRange}`).split('\n').filter(Boolean)
const changelogBody = parseChangelog(rawCommits)

const date = new Date().toISOString().split('T')[0]
const tagName = `v${newVersion}`
const changelogEntry = `## [${newVersion}] - ${date}\n\n${changelogBody || '- No significant changes'}`

// Update CHANGELOG.md
let changelog = ''
try {
  changelog = readFileSync('CHANGELOG.md', 'utf8')
} catch {
  changelog = '# Changelog\n\nAll notable changes to this project will be documented in this file.\n\n'
}

// Insert after the first heading
const insertAfter = '# Changelog\n\nAll notable changes to this project will be documented in this file.\n\n'
if (changelog.includes(insertAfter)) {
  changelog = changelog.replace(insertAfter, insertAfter + changelogEntry + '\n\n')
} else {
  changelog = `# Changelog\n\nAll notable changes to this project will be documented in this file.\n\n${changelogEntry}\n\n${changelog}`
}

// Update package.json
pkg.version = newVersion
writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n')

// Update app.json
appJson.expo.version = newVersion
writeFileSync('app.json', JSON.stringify(appJson, null, 2) + '\n')

// Write changelog
writeFileSync('CHANGELOG.md', changelog)

// Commit and tag
run('git add package.json app.json CHANGELOG.md')
run(`git commit -m "chore(release): ${tagName}"`)
run(`git tag -a ${tagName} -m "Release ${tagName}"`)

console.log(`✓ Version bumped to ${newVersion}`)
console.log(`✓ CHANGELOG.md updated`)
console.log(`✓ Committed and tagged ${tagName}`)
console.log(`\nTo push the release:\n  git push origin main && git push origin ${tagName}\n`)
