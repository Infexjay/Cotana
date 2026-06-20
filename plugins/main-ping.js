import { formatStatus } from '../lib/responses.js'
import speed from 'performance-now'

let handler = async (m, { conn }) => {
  let timestamp = speed()
  let pingMsg = await m.reply(formatStatus('Speed check', 'Measuring response time...'))

  let latency = (speed() - timestamp).toFixed(4)

  await conn.relayMessage(
    m.chat,
    {
          protocolMessage: {
        key: pingMsg.key,
        type: 14,
        editedMessage: {
          conversation: formatStatus('Speed result', 'Connection is responsive.', [
            `Latency: ${latency} ms`
          ]),
        },
      },
    },
    {}
  )
}

handler.help = ['ping']
handler.tags = ['main']
handler.command = ['ping', 'speed']
handler.desc = 'Check bot response time and server latency'

export default handler
