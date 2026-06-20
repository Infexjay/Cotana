import fs from 'fs'
import path from 'path'
import fetch from 'node-fetch'
import * as cheerio from 'cheerio'
import ffmpegPath from 'ffmpeg-static'
import youtubeDl from 'youtube-dl-exec'

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36'
const SEARCH_TIMEOUT_MS = 30_000

function safeFileBase(title, fallback = 'video') {
  return (title || fallback)
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 100) || fallback
}

function absoluteUrl(baseUrl, href) {
  return new URL(href, baseUrl).toString()
}

function uniqueByUrl(items) {
  const seen = new Set()
  return items.filter(item => {
    if (!item.url || seen.has(item.url)) return false
    seen.add(item.url)
    return true
  })
}

async function fetchHtml(url) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), SEARCH_TIMEOUT_MS)

  try {
    const response = await fetch(url, {
      headers: {
        'user-agent': USER_AGENT,
        'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'accept-language': 'en-US,en;q=0.9'
      },
      signal: controller.signal
    })

    if (!response.ok) throw new Error(`Search failed with HTTP ${response.status}`)
    return response.text()
  } finally {
    clearTimeout(timeout)
  }
}

export async function searchXVideos(query, limit = 10) {
  const searchUrl = `https://www.xvideos.com/?k=${encodeURIComponent(query)}`
  const html = await fetchHtml(searchUrl)
  const $ = cheerio.load(html)
  const results = []

  $('a[href^="/video"]').each((_, element) => {
    const href = $(element).attr('href')
    if (!href || !/^\/video\.[^/]+\//i.test(href)) return

    const title = ($(element).attr('title') || $(element).text() || '')
      .replace(/\s+/g, ' ')
      .trim()
    if (!title || title.length < 3) return

    results.push({
      title,
      url: absoluteUrl('https://www.xvideos.com', href)
    })
  })

  return uniqueByUrl(results).slice(0, limit)
}

export async function searchPornhub(query, limit = 10) {
  const searchUrl = `https://www.pornhub.com/video/search?search=${encodeURIComponent(query)}`
  const html = await fetchHtml(searchUrl)
  const $ = cheerio.load(html)
  const results = []

  $('a[href*="view_video.php?viewkey="]').each((_, element) => {
    const href = $(element).attr('href')
    if (!href) return

    const title = ($(element).attr('title') || $(element).data('title') || $(element).text() || '')
      .toString()
      .replace(/\s+/g, ' ')
      .trim()
    if (!title || title.length < 3) return

    results.push({
      title,
      url: absoluteUrl('https://www.pornhub.com', href)
    })
  })

  return uniqueByUrl(results).slice(0, limit)
}

function findDownloadedFile(dir, marker) {
  const markerText = `_${marker}.`
  const matches = fs.readdirSync(dir)
    .filter(name => name.includes(markerText))
    .map(name => path.join(dir, name))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)

  return matches[0] || null
}

function mimeFor(filePath) {
  const ext = path.extname(filePath).toLowerCase()
  if (ext === '.webm') return 'video/webm'
  if (ext === '.mkv') return 'video/x-matroska'
  return 'video/mp4'
}

export async function downloadAdultVideo(url, tmpDir, fallbackTitle = 'adult-video') {
  const marker = Date.now()
  const output = path.join(tmpDir, `%(title).100B_${marker}.%(ext)s`)

  await youtubeDl(url, {
    format: 'best[ext=mp4][vcodec!=none][acodec!=none][height<=480]/best[vcodec!=none][acodec!=none][height<=480]/best[ext=mp4][vcodec!=none][acodec!=none]/best',
    output,
    noPlaylist: true,
    noWarnings: true,
    restrictFilenames: true,
    mergeOutputFormat: 'mp4',
    remuxVideo: 'mp4',
    maxFilesize: '95M',
    jsRuntimes: 'node',
    ...(ffmpegPath ? { ffmpegLocation: ffmpegPath } : {}),
    ...(process.env.YTDLP_PROXY?.trim() ? { proxy: process.env.YTDLP_PROXY.trim() } : {})
  }, { timeout: 240_000 })

  const filePath = findDownloadedFile(tmpDir, marker)
  if (!filePath) throw new Error('yt-dlp finished but no downloaded file was found')

  const ext = path.extname(filePath).replace('.', '') || 'mp4'
  const title = path.basename(filePath, path.extname(filePath)).replace(new RegExp(`_${marker}$`), '') || fallbackTitle

  return {
    title,
    filePath,
    fileName: `${safeFileBase(title, fallbackTitle)}.${ext}`,
    mimetype: mimeFor(filePath)
  }
}
