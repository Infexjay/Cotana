import chalk from 'chalk'
import { spawn } from 'child_process'
import express from 'express'
import figlet from 'figlet'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import bodyParser from 'body-parser'
import dotenv from 'dotenv'

dotenv.config()

let pairingCode = null
let isConnected = false
let botProcess = null
let botStats = null
const mongodbUri = process.env.MONGODB_URI || 'mongodb://localhost:27017'
const phoneNumber = process.env.PHONE_NUMBER
const keepAliveIntervalMs = Number(process.env.KEEP_ALIVE_INTERVAL_MS || 4 * 60 * 1000)

figlet(
  'COTANA OS',
  {
    font: 'Slant',
    horizontalLayout: 'default',
    verticalLayout: 'default',
  },
  (err, data) => {
    if (err) {
      console.error(chalk.red('Figlet error:', err))
      return
    }
    console.log(chalk.cyan(data))
  }
)

figlet(
  'Automation Engine',
  {
    horizontalLayout: 'default',
    verticalLayout: 'default',
  },
  (err, data) => {
    if (err) {
      console.error(chalk.red('Figlet error:', err))
      return
    }
    console.log(chalk.blue(data))
  }
)

import rateLimit from 'express-rate-limit'
const app = express()
app.set('trust proxy', 1)
const port = process.env.PORT || 5000
const keepAliveUrl = resolveKeepAliveUrl()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

app.use(express.static(path.join(__dirname, 'Assets')))
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

const homeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
})

app.get('/', homeLimiter, (req, res) => {
  if (fs.existsSync(path.join(__dirname, 'Assets', 'cotana.html'))) {
    res.sendFile(path.join(__dirname, 'Assets', 'cotana.html'))
  } else {
    res.send('<h1>COTANA BOT</h1><p>Bot is starting...</p>')
  }
})

app.get('/healthz', (req, res) => {
  res.json({
    ok: true,
    uptime: process.uptime(),
    connected: isConnected,
    timestamp: new Date().toISOString()
  })
})

app.get('/pairing-status', (req, res) => {
  res.json({
    pairingCode: pairingCode,
    connected: isConnected,
    stats: isConnected ? botStats : null
  })
})

app.get('/bot-stats', (req, res) => {
  if (botStats) {
    res.json(botStats)
  } else {
    requestBotStats()
    res.status(503).json({ error: 'Bot statistics not available yet' })
  }
})

const isMainModule = process.argv[1] && path.resolve(process.argv[1]) === __filename

if (isMainModule) {
  app.listen(port, () => {
    console.log(chalk.green(`Server running on port ${port}`))
    console.log(chalk.cyan('Open your browser and navigate to:'))
    console.log(chalk.yellow(`http://localhost:${port}`))

    startBot()

    setInterval(requestBotStats, 30000)
    startKeepAlive()
  })
}


function resolveKeepAliveUrl() {
  if (process.env.KEEP_ALIVE_URL) return process.env.KEEP_ALIVE_URL
  if (process.env.APP_URL) return process.env.APP_URL
  if (process.env.PUBLIC_URL) return process.env.PUBLIC_URL
  if (process.env.KOYEB_PUBLIC_DOMAIN) return `https://${process.env.KOYEB_PUBLIC_DOMAIN}`
  return `http://127.0.0.1:${port}`
}

function normalizeKeepAliveUrl(url) {
  const target = new URL(url)
  if (!target.pathname || target.pathname === '/') target.pathname = '/healthz'
  return target.toString()
}

async function pingKeepAlive() {
  const target = normalizeKeepAliveUrl(keepAliveUrl)
  try {
    const response = await fetch(target, {
      method: 'GET',
      headers: {
        'User-Agent': 'Cotana-KeepAlive/1.0'
      }
    })

    if (!response.ok) {
      console.warn(chalk.yellow(`Keep-alive ping returned ${response.status} from ${target}`))
    }
  } catch (error) {
    console.warn(chalk.yellow(`Keep-alive ping failed for ${target}: ${error.message}`))
  }
}

function startKeepAlive() {
  if (process.env.KEEP_ALIVE === 'false') {
    console.log(chalk.yellow('Keep-alive worker disabled by KEEP_ALIVE=false'))
    return
  }

  if (!Number.isFinite(keepAliveIntervalMs) || keepAliveIntervalMs < 60000) {
    console.warn(chalk.yellow('KEEP_ALIVE_INTERVAL_MS must be at least 60000; using 240000'))
  }

  const intervalMs = Number.isFinite(keepAliveIntervalMs) && keepAliveIntervalMs >= 60000
    ? keepAliveIntervalMs
    : 4 * 60 * 1000

  console.log(chalk.green(`Keep-alive worker active: pinging ${normalizeKeepAliveUrl(keepAliveUrl)} every ${Math.round(intervalMs / 1000)}s`))
  pingKeepAlive()
  setInterval(pingKeepAlive, intervalMs)
}

function startBot() {
  if (botProcess) return

  console.log(chalk.blue('Starting COTANA Bot with:'))
  console.log(chalk.blue(`MongoDB URI:`))
  console.log(chalk.blue(`Phone number is ${phoneNumber ? 'set' : 'not specified'}`))

  if (!mongodbUri) {
    console.error(chalk.red('MONGODB_URI environment variable is required!'))
    return
  }

  const currentFilePath = new URL(import.meta.url).pathname
  const args = [path.join(path.dirname(currentFilePath), 'Cotana.js'), ...process.argv.slice(2)]

  const env = {
    ...process.env,
    MONGODB_URI: mongodbUri,
    PHONE_NUMBER: phoneNumber,
    PAIRING_MODE: 'true'
  }

  botProcess = spawn(process.argv[0], args, {
    stdio: ['inherit', 'inherit', 'inherit', 'ipc'],
    env
  })

  botProcess.on('message', data => {
    console.log(chalk.cyan(`✔️RECEIVED ${JSON.stringify(data)}`))

    if (typeof data === 'object' && data.type === 'pairing-code') {
      pairingCode = data.code
      console.log(chalk.green(`Pairing code received: ${pairingCode}`))
    } else if (typeof data === 'object' && data.type === 'connection-status') {
      isConnected = data.connected
      console.log(chalk.green(`Connection status: ${isConnected ? 'Connected' : 'Disconnected'}`))
    } else if (typeof data === 'object' && data.type === 'stats') {
      botStats = data.stats
      console.log(chalk.green(`Bot statistics updated`))
    } else {
      switch (data) {
        case 'reset':
          botProcess.kill()
          botProcess = null
          startBot()
          break
        case 'uptime':
          botProcess.send(process.uptime())
          break
      }
    }
  })

  botProcess.on('exit', code => {
    botProcess = null
    console.error(chalk.red(`❌Bot exited with code: ${code}`))

    if (code === 0) return

    setTimeout(() => {
      console.log(chalk.yellow('Attempting to restart bot...'))
      startBot()
    }, 5000)
  })

  botProcess.on('error', err => {
    console.error(chalk.red(`Error: ${err}`))
    botProcess.kill()
    botProcess = null

    setTimeout(() => {
      console.log(chalk.yellow('Attempting to restart bot after error...'))
      startBot()
    }, 5000)
  })
}

function requestBotStats() {
  if (botProcess && isConnected) {
    botProcess.send({ type: 'request-stats' })
  }
}

process.on('unhandledRejection', (reason) => {
  console.error(chalk.red(`Unhandled promise rejection: ${reason}`))
  console.error(chalk.red(`Bot will restart...`))
  if (botProcess) {
    botProcess.kill()
    botProcess = null
  }
  startBot()
})

process.on('exit', code => {
  console.error(chalk.red(`Exiting with code: ${code}`))
  if (botProcess) {
    botProcess.kill()
  }
})
