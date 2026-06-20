let handler = async (m, { usedPrefix, command, text }) => {
  const user = global.db.data.users[m.sender]
  if (user.registered) throw 'You are already registered.'

  if (!text) {
    throw `Usage: *${usedPrefix + command} name.age agree*\n\nExample: *${usedPrefix + command} Jay.18 agree*`
  }

  const match = text.match(/^(.+?)\.(\d{1,3})(?:\s+(.+))?$/)
  if (!match) {
    throw `Usage: *${usedPrefix + command} name.age agree*\n\nExample: *${usedPrefix + command} Jay.18 agree*`
  }

  const name = match[1].trim()
  const age = Number(match[2])
  const agreement = (match[3] || '').trim().toLowerCase()

  if (name.length < 2) throw 'Name must be at least 2 characters.'
  if (!Number.isInteger(age) || age < 1 || age > 120) throw 'Enter a valid age.'
  if (age < 18) throw 'You must be at least 18 years old to register for this bot.'
  if (!/^(agree|yes|i agree|18|adult)$/i.test(agreement)) {
    throw `You must agree that you are 18 years old or above.\n\nUse: *${usedPrefix + command} ${name}.${age} agree*`
  }

  user.name = name
  user.age = age
  user.adultAgreed = true
  user.registered = true
  user.regTime = Date.now()

  m.reply(`✅ Registered as *${name}* (${age}).\n🔞 18+ agreement saved.`)
}

handler.help = ['reg <name.age agree>', 'register <name.age agree>']
handler.tags = ['main']
handler.command = /^(reg|register)$/i
handler.desc = 'Register a user and record 18+ agreement.'

export default handler
