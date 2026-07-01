import { formatResponse, waStyle } from '../lib/responses.js'

let handler = async (m, { conn }) => {
  let user = global.db.data.users[m.sender]
  let affection = user.affection || 50

  let status = ''
  if (affection >= 90) status = 'Obsessed 💘'
  else if (affection >= 70) status = 'Loving 💖'
  else if (affection >= 50) status = 'Neutral ✨'
  else if (affection >= 30) status = 'Boring 🥱'
  else status = 'Hated 😤'

  let bar = '▰'.repeat(Math.floor(affection / 10)) + '▱'.repeat(10 - Math.floor(affection / 10))

  let message = `
*YOUR AFFECTION STATS* 🍭

✧ Status: ${waStyle.bold(status)}
✧ Level: ${waStyle.bold(affection + '%')}
[${bar}]

${affection < 40 ? 'You\'re being a bit of a bore... Try to be more interesting! 💅' : 'You\'re doing okay, I guess... keep it up! 😈'}
  `.trim()

  m.reply(formatResponse(message))
}

handler.help = ['affection']
handler.tags = ['main']
handler.command = ['affection', 'love']

export default handler
