import { formatStatus, formatUsage } from '../lib/responses.js'

let handler = async (m, { usedPrefix, command, text }) => {
  const user = global.db.data.users[m.sender]
  if (user.registered) throw formatStatus('Already registered', 'Your profile is already active.')

  if (!text) {
    throw formatUsage(`${usedPrefix + command} name.age agree`, `${usedPrefix + command} Jay.18 agree`, 'The agreement confirms you are 18 or older.')
  }

  const match = text.match(/^(.+?)\.(\d{1,3})(?:\s+(.+))?$/)
  if (!match) {
    throw formatUsage(`${usedPrefix + command} name.age agree`, `${usedPrefix + command} Jay.18 agree`, 'Keep the dot between name and age.')
  }

  const name = match[1].trim()
  const age = Number(match[2])
  const agreement = (match[3] || '').trim().toLowerCase()

  if (name.length < 2) throw formatStatus('Registration stopped', 'Name must be at least 2 characters.')
  if (!Number.isInteger(age) || age < 1 || age > 120) throw formatStatus('Registration stopped', 'Enter a valid age.')
  if (age < 18) throw formatStatus('Registration stopped', 'You must be at least 18 years old to register for this bot.')
  if (!/^(agree|yes|i agree|18|adult)$/i.test(agreement)) {
    throw formatStatus('Agreement needed', 'Confirm that you are 18 or older.', [
      `Use ${usedPrefix + command} ${name}.${age} agree`
    ])
  }

  user.name = name
  user.age = age
  user.adultAgreed = true
  user.registered = true
  user.regTime = Date.now()

  m.reply(formatStatus('Registration complete', 'Your profile is active.', [
    `Name: ${name}`,
    `Age: ${age}`,
    '18+ agreement saved'
  ]))
}

handler.help = ['reg <name.age agree>', 'register <name.age agree>']
handler.tags = ['main']
handler.command = /^(reg|register)$/i
handler.desc = 'Register a user and record 18+ agreement.'

export default handler
