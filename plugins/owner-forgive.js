import { formatResponse } from '../lib/responses.js'

let handler = async (m, { conn, text, usedPrefix, command }) => {
  let who = m.mentionedJid && m.mentionedJid[0] ? m.mentionedJid[0] : m.quoted ? m.quoted.sender : text ? text.replace(/[^0-9]/g, '') + '@s.whatsapp.net' : false

  if (!who) return m.reply(formatResponse(`Mention the person you want to forgive, Master Chief! 🍒\nUsage: ${usedPrefix}${command} @user`))

  let user = global.db.data.users[who]
  if (!user) return m.reply(formatResponse('I don\'t even know who that is! 💅'))

  user.affection = 50
  user.warn = 0

  m.reply(formatResponse(`Fine, since you asked nicely, Master Chief... I\'ve forgiven @${who.split('@')[0]}. They better not be boring again! 🙄💖`), null, { mentions: [who] })
}

handler.help = ['forgive @user']
handler.tags = ['owner']
handler.command = ['forgive', 'resetuser']
handler.owner = true

export default handler
