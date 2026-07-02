/* global console, fetch, process */

import { execFileSync } from 'node:child_process'

const token = requiredEnv('GH_TOKEN')
const owner = requiredEnv('PACKAGE_OWNER')
const packageName = requiredEnv('PACKAGE_NAME')
const image = process.env.REGISTRY_IMAGE ?? `ghcr.io/${owner.toLowerCase()}/${packageName}`
const minAgeDays = Number.parseFloat(process.env.MIN_AGE_DAYS ?? '7')
const dryRun = process.env.DRY_RUN !== 'false'
const deleteShaOnly = process.env.DELETE_SHA_ONLY !== 'false'

if (!Number.isFinite(minAgeDays) || minAgeDays < 0) {
  throw new Error(`MIN_AGE_DAYS must be a non-negative number, got ${process.env.MIN_AGE_DAYS}`)
}

const versions = await listPackageVersions()
const protectedDigests = new Set()
const taggedVersions = versions.filter((version) => publicTags(version).length > 0)

for (const version of taggedVersions) {
  protectedDigests.add(version.name)

  const rawManifest = execFileSync(
    'docker',
    ['buildx', 'imagetools', 'inspect', '--raw', `${image}@${version.name}`],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }
  )
  const manifest = JSON.parse(rawManifest)

  if (Array.isArray(manifest.manifests)) {
    for (const child of manifest.manifests) {
      if (child.digest) {
        protectedDigests.add(child.digest)
      }
    }
  }
}

const minimumCreatedAt = Date.now() - minAgeDays * 24 * 60 * 60 * 1000
const candidates = versions
  .filter((version) => isCleanupCandidate(version, minimumCreatedAt, protectedDigests))
  .sort((left, right) => new Date(left.created_at).getTime() - new Date(right.created_at).getTime())

console.log(`Package: ${owner}/${packageName}`)
console.log(`Versions found: ${versions.length}`)
console.log(`Tagged versions protecting manifests: ${taggedVersions.length}`)
console.log(`Protected digests: ${protectedDigests.size}`)
console.log(`Cleanup candidates: ${candidates.length}`)
console.log(`Dry run: ${dryRun}`)

for (const version of candidates) {
  const tags = containerTags(version)
  const tagLabel = tags.length > 0 ? tags.join(', ') : 'untagged'
  console.log(`Deleting ${version.name} (${tagLabel}, ${version.created_at})`)

  if (!dryRun) {
    await githubApi(
      `/orgs/${owner}/packages/container/${encodeURIComponent(packageName)}/versions/${version.id}`,
      { method: 'DELETE' }
    )
  }
}

function isCleanupCandidate(version, minimumCreatedAt, protectedDigests) {
  const tags = containerTags(version)
  const isUntagged = tags.length === 0
  const isShaOnly = deleteShaOnly && tags.length > 0 && tags.every((tag) => tag.startsWith('sha-'))
  const isOldEnough = new Date(version.created_at).getTime() <= minimumCreatedAt

  return (isUntagged || isShaOnly) && isOldEnough && !protectedDigests.has(version.name)
}

function publicTags(version) {
  return containerTags(version).filter((tag) => !tag.startsWith('sha-'))
}

function containerTags(version) {
  return version.metadata?.container?.tags ?? []
}

async function listPackageVersions() {
  const versions = []
  let page = 1

  while (true) {
    const batch = await githubApi(
      `/orgs/${owner}/packages/container/${encodeURIComponent(packageName)}/versions?per_page=100&page=${page}`
    )

    versions.push(...batch)

    if (batch.length < 100) {
      return versions
    }

    page += 1
  }
}

async function githubApi(path, init = {}) {
  const response = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      ...init.headers,
    },
  })

  if (response.status === 204) {
    return null
  }

  const text = await response.text()

  if (!response.ok) {
    throw new Error(`GitHub API ${response.status} ${response.statusText}: ${text}`)
  }

  return JSON.parse(text)
}

function requiredEnv(name) {
  const value = process.env[name]

  if (!value) {
    throw new Error(`${name} is required`)
  }

  return value
}
