import fs from 'fs'
import os from 'os'
import {
  downloadAdultVideo,
  searchPornhub,
  searchXVideos
} from '../lib/adult-video-downloader.js'
import { formatResponse, formatSelectionList, formatStatus, formatUsage } from '../lib/responses.js'

const tmpDir = os.tmpdir()
const SESSION_KEY = 'cotanaAdultVideo'
const SESSION_TTL_MS = 150 * 1000

const sources = {
  xvid: {
    label: 'XVideos',
    search: searchXVideos,
    command: '.xvid'
  },
  povid: {
    label: 'Pornhub',
    search: searchPornhub,
    command: '.povid'
  }
}

const handler = async (m, { conn, command, text, usedPrefix }) => {
  if (!text) throw formatUsage(`${usedPrefix + command} <search text>`, `${usedPrefix + command} search words`)
  if (!canUseAdultCommands(m, conn)) return

  const source = sources[command.toLowerCase()]
  if (!source) return

  conn[SESSION_KEY] = conn[SESSION_KEY] || {}
  await conn.reply(m.chat, formatStatus(`${source.label} search`, 'Looking for matching videos...'), m)

  const results = await source.search(text, 10)
  if (!results.length) throw formatStatus(`${source.label} search`, 'No videos matched that search.')

  const list = formatSelectionList(results)

  const { key } = await conn.reply(
    m.chat,
    formatResponse(
      [
        'Reply with a number to download the video.',
        '18+ access is logged by registration agreement.',
        '',
        list
      ].join('\n'),
      { title: `${source.label} selector`, footer: 'Selection expires in 150s' }
    ),
    m
  )

  conn[SESSION_KEY][m.sender] = {
    results,
    source,
    key,
    timeout: setTimeout(() => {
      conn.sendMessage(m.chat, { delete: key })
      delete conn[SESSION_KEY][m.sender]
    }, SESSION_TTL_MS)
  }
}

handler.before = async (m, { conn }) => {
  conn[SESSION_KEY] = conn[SESSION_KEY] || {}
  if (m.isBaileys || !(m.sender in conn[SESSION_KEY])) return
  if (!m.quoted || !m.text) return

  const session = conn[SESSION_KEY][m.sender]
  if (m.quoted.id !== session.key.id) return
  if (!canUseAdultCommands(m, conn)) {
    clearTimeout(session.timeout)
    delete conn[SESSION_KEY][m.sender]
    return
  }

  const inputNumber = Number(m.text.trim())
  if (!Number.isInteger(inputNumber) || inputNumber < 1 || inputNumber > session.results.length) {
    return m.reply(formatStatus('Invalid selection', `Pick a number from 1 to ${session.results.length}.`))
  }

  clearTimeout(session.timeout)
  const selected = session.results[inputNumber - 1]

  try {
    await conn.reply(m.chat, formatStatus('Preparing video', `Downloading ${selected.title}...`), m)
    const video = await downloadAdultVideo(selected.url, tmpDir, session.source.label)

    await conn.sendFile(
      m.chat,
      video.filePath,
      video.fileName,
      `🎬 ${video.title}`,
      m,
      false,
      { mimetype: video.mimetype }
    )

    setTimeout(() => {
      try {
        if (fs.existsSync(video.filePath)) {
          fs.unlinkSync(video.filePath)
          console.log(`Deleted temp file: ${video.filePath}`)
        }
      } catch (cleanupErr) {
        console.error('Error during adult video cleanup:', cleanupErr)
      }
    }, 10_000)
  } catch (error) {
    console.error(`${session.source.label} download error:`, error)
    await conn.reply(m.chat, formatStatus('Download failed', error.message), m)
  } finally {
    delete conn[SESSION_KEY][m.sender]
  }
}

handler.help = ['xvid <prompt>', 'povid <prompt>']
handler.tags = ['downloader']
handler.command = /^(xvid|povid)$/i
handler.desc = 'Search adult video sites and download a selected result after registration and NSFW approval.'
handler.limit = true

export default handler

function canUseAdultCommands(m, conn) {
  const user = global.db.data.users[m.sender] || {}
  const chat = global.db.data.chats[m.chat] || {}

  if (!user.registered) {
    global.dfail('unreg', m, conn)
    return false
  }

  if (Number(user.age) < 18 || !user.adultAgreed) {
    m.reply(formatStatus('18+ agreement required', 'Register first and confirm that you are 18 or older.', [
      'Use .reg name.18 agree'
    ]))
    return false
  }

  if (m.isGroup && !chat.nsfw) {
    global.dfail('nsfw', m, conn)
    return false
  }

  return true
}
