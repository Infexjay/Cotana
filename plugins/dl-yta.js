import ytdl from '@distube/ytdl-core'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { pipeline } from 'stream'
import { promisify } from 'util'

const streamPipeline = promisify(pipeline)
const tmpDir = os.tmpdir()

// Load cookies for YouTube
let agent
try {
  if (fs.existsSync('Assets/cookies.json')) {
    const cookies = JSON.parse(fs.readFileSync('Assets/cookies.json', 'utf-8'))
    agent = ytdl.createAgent(cookies)
  }
} catch (e) {
  console.error('Error loading YouTube cookies:', e)
}

let handler = async (m, { conn, args, usedPrefix, command }) => {
  if (!args || !args[0]) throw `✳️ Example :\n${usedPrefix + command} https://youtu.be/YzkTFFwxtXI`
  if (!args[0].match(/youtu/gi)) throw `❎ Verify that it is a YouTube link.`
  
  try {
    await m.reply('⏳ Processing your request, please wait...');
    
    const info = await ytdl.getInfo(args[0], { agent })
    const title = info.videoDetails.title.replace(/[^\w\s]/gi, '').replace(/\s+/g, '_')
    const filePath = path.join(tmpDir, `${title}.mp3`)
    
    const stream = ytdl(args[0], {
      quality: 'highestaudio',
      filter: 'audioonly',
      agent
    })
    
    await streamPipeline(stream, fs.createWriteStream(filePath))
    
    const message = {
      audio: { url: filePath },
      mimetype: 'audio/mpeg',
      fileName: `${title}.mp3`,
      ptt: false
    };
    
    await conn.sendMessage(m.chat, message, { quoted: m });
    
    // Cleanup
    setTimeout(() => {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
    }, 10000)
    
  } catch (error) {
    console.error('Error in YouTube audio download:', error);
    await m.reply(`❎ Error: Could not download the audio. ${error.message}`);
  }
}

handler.help = ['ytmp3 <url>']
handler.tags = ['downloader']
handler.command = ['ytmp3', 'yta']
handler.desc = 'Download YouTube audio using a URL'

export default handler
