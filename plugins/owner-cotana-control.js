import { formatResponse } from '../lib/responses.js'

let handler = async (m, { conn, command, isOwner }) => {
  let chat = global.db.data.chats[m.chat]

  // Cotana Control Commands
  if (/^cotana$/i.test(command)) {
    let text = (m.text || '').split(' ')[1]
    if (text === 'stop') {
      chat.cotanaStop = true
      return m.reply(formatResponse('Ugh, fine. I\'ll stop talking to these boring people. Only you can talk to me now! 💅✨'))
    } else if (text === 'start') {
      chat.cotanaStop = false
      return m.reply(formatResponse('I\'m back, darlings! Missed me? 😈🍒🍭'))
    }
  }

  // Cotana Mode Commands
  const modes = {
    sw: 'sweet',
    wat: 'warmth',
    agg: 'aggressive',
    ag: 'anime',
    av: 'anime', // Anime girl vibe
    te: 'techy',
    th: 'techy',
    chill: 'chill'
  }

  let mode = command.replace('cot.', '')
  if (modes[mode]) {
    chat.cotanaMode = modes[mode]
    let response = {
      sweet: 'Aww, I\'ll be extra sweet to you from now on! 🍭✨💖',
      warmth: 'I\'ll keep you warm and cozy, darling. ☕🍒✨',
      aggressive: 'Oh, you want me to be mean? I can definitely do that. 😈🔥🐍',
      anime: 'Back to my nutty anime girl self! 🌪️🍭😈',
      techy: 'Beep boop. Optimizing response protocols for maximum efficiency. 🤖💻✨',
      chill: 'Let\'s just relax and vibe, okay? 🌊✨🍃'
    }[modes[mode]]

    return m.reply(formatResponse(response))
  }
}

handler.help = ['cotana stop', 'cotana start', 'cot.sw', 'cot.wat', 'cot.agg', 'cot.ag', 'cot.te', 'cot.chill']
handler.tags = ['owner', 'group']
handler.command = /^(cotana|cot\.sw|cot\.wat|cot\.agg|cot\.ag|cot\.av|cot\.te|cot\.th|cot\.chill)$/i
handler.owner = true

export default handler
