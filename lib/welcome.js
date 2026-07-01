import { Jimp, JimpMime, loadFont } from 'jimp'
import * as fonts from 'jimp/fonts'
import axios from 'axios'

export async function generateWelcomeCard(userJid, userName, groupName, type = 'welcome') {
  try {
    // Create a base background (dark gradient look)
    const width = 800
    const height = 400
    const canvas = new Jimp({ width, height, color: 0x1a1a1aff }) // Dark grey

    // Load user profile picture
    let ppUrl = 'https://i.imgur.com/8B4jwGq.jpeg'
    try {
      // In a real environment, you'd pass conn.profilePictureUrl here.
      // For the utility, we'll assume the URL is fetched elsewhere or use placeholder.
    } catch (e) {}

    const pp = await Jimp.read(userJid || ppUrl).catch(() => Jimp.read(ppUrl))
    pp.resize({ w: 200, h: 200 })

    // Circle crop for PP
    pp.circle()

    // Add border to PP
    const border = new Jimp({ width: 210, height: 210, color: type === 'welcome' ? 0xff00ffff : 0xff0000ff }) // Pink for welcome, Red for bye
    border.circle()
    canvas.composite(border, 50 - 5, 100 - 5)
    canvas.composite(pp, 50, 100)

    // Load fonts
    const fontTitle = await loadFont(fonts.SANS_64_WHITE)
    const fontSub = await loadFont(fonts.SANS_32_WHITE)

    // Text content
    const titleText = type === 'welcome' ? 'WELCOME!' : 'GOODBYE!'
    const welcomeMsg = type === 'welcome' ? 'New identity detected...' : 'Identity terminated...'

    canvas.print({ font: fontTitle, x: 300, y: 100, text: titleText })
    canvas.print({ font: fontSub, x: 300, y: 180, text: userName.slice(0, 20) })
    canvas.print({ font: fontSub, x: 300, y: 230, text: groupName.slice(0, 25) })
    canvas.print({ font: fontSub, x: 300, y: 280, text: welcomeMsg })

    // Optional: Add some "noise" or techy lines for Cotana vibe
    for (let i = 0; i < 5; i++) {
        const line = new Jimp({ width: 500, height: 2, color: 0xff00ff33 })
        canvas.composite(line, 300, 320 + (i * 10))
    }

    return await canvas.getBuffer(JimpMime.png)
  } catch (error) {
    console.error('Error generating welcome card:', error)
    return null
  }
}
