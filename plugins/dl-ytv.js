
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

function extractVideoId(url) {
  const patterns = [
    /(?:v=|vi=)([a-zA-Z0-9_-]{11})/, // watch?v=ID
    /(?:be\/|embed\/|shorts\/)([a-zA-Z0-9_-]{11})/, // youtu.be/ID, embed/ID, shorts/ID
    /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/ // youtube.com/v/ID
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

let handler = async (m, { conn, args, usedPrefix, command }) => {
  if (!args || !args[0]) throw `✳️ Example :\n${usedPrefix + command} https://youtu.be/YzkTFFwxtXI`
  if (!args[0].match(/youtu/gi)) throw `❎ Verify that it is a YouTube link.`
  
  try {
    await m.reply('⏳ Processing your request, please wait...');
    
    const videoId = extractVideoId(args[0]) || 'video';
    const filePath = path.join(tmpDir, `${videoId}.mp4`)
    
    const stream = ytdl(args[0], {
      quality: 'highest',
      filter: 'audioandvideo',
      agent
    })
    
    await streamPipeline(stream, fs.createWriteStream(filePath))
    
    await conn.sendFile(m.chat, filePath, `${videoId}.mp4`, '', m, false, { mimetype: 'video/mp4' });
    
    // Cleanup
    setTimeout(() => {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
    }, 10000)
    
  } catch (error) {
    console.error('Error in YouTube video download:', error);
    await m.reply(`❎ Error: Could not download the video. ${error.message}`);
  }
}

handler.help = ['ytmp4 <url>']
handler.tags = ['downloader']
handler.command = ['ytmp4', 'ytv']
handler.desc = 'Download YouTube video using a URL'

export default handler

