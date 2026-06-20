import { formatStatus, formatUsage } from '../lib/responses.js'

let handler = async (m, { args, usedPrefix, command }) => {
  const configuredPin = process.env.NSFW_PIN?.trim()
  if (!configuredPin) throw formatStatus('NSFW setup missing', 'NSFW_PIN is not configured in the server environment.')

  const suppliedPin = (args[0] || '').trim()
  if (!suppliedPin) throw formatUsage(`${usedPrefix + command} <pin>`, `${usedPrefix + command} 1234`)
  if (suppliedPin !== configuredPin) throw formatStatus('Access denied', 'Invalid NSFW pin.')

  global.db.data.chats[m.chat].nsfw = command.toLowerCase() === 'addnsfw'
  m.reply(formatStatus('Group NSFW access', `NSFW commands are now ${global.db.data.chats[m.chat].nsfw ? 'ON' : 'OFF'} for this group.`))
}

handler.help = ['addnsfw <pin>', 'delnsfw <pin>']
handler.tags = ['owner']
handler.command = /^(addnsfw|delnsfw)$/i
handler.desc = 'Owner-only NSFW group switch protected by NSFW_PIN.'
handler.owner = true
handler.group = true

export default handler
