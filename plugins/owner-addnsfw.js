let handler = async (m, { args, usedPrefix, command }) => {
  const configuredPin = process.env.NSFW_PIN?.trim()
  if (!configuredPin) throw 'NSFW_PIN is not configured in the server environment.'

  const suppliedPin = (args[0] || '').trim()
  if (!suppliedPin) throw `Usage: *${usedPrefix + command} <pin>*`
  if (suppliedPin !== configuredPin) throw 'Invalid NSFW pin.'

  global.db.data.chats[m.chat].nsfw = command.toLowerCase() === 'addnsfw'
  m.reply(`✅ NSFW commands are now *${global.db.data.chats[m.chat].nsfw ? 'ON' : 'OFF'}* for this group.`)
}

handler.help = ['addnsfw <pin>', 'delnsfw <pin>']
handler.tags = ['owner']
handler.command = /^(addnsfw|delnsfw)$/i
handler.desc = 'Owner-only NSFW group switch protected by NSFW_PIN.'
handler.owner = true
handler.group = true

export default handler
