const TelegramBot = require('telegram-bot-api');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Load environment variables
dotenv.config();

// Initialize Telegram Bot
const bot = new TelegramBot({
  token: process.env.TELEGRAM_BOT_TOKEN || 'YOUR_TELEGRAM_BOT_TOKEN',
  updates: {
    enabled: true,
    get_interval: 1000
  }
});

// Helper function to generate JWT token
const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, telegramId: user.telegramId },
    process.env.JWT_SECRET || 'alphawulfsecret',
    { expiresIn: '30d' }
  );
};

// Start the bot
const startBot = async () => {
  try {
    console.log('Starting Alpha Wulf Telegram Bot...');
    
    // Set up webhook or start polling
    if (process.env.NODE_ENV === 'production' && process.env.WEBHOOK_URL) {
      await bot.setWebhook(process.env.WEBHOOK_URL);
      console.log(`Webhook set to ${process.env.WEBHOOK_URL}`);
    } else {
      // Start polling for updates
      bot.start();
      console.log('Bot started in polling mode');
    }
    
    // Handle /start command
    bot.on('message', async (message) => {
      try {
        if (message.text === '/start') {
          const telegramId = message.from.id.toString();
          const username = message.from.username || `user${telegramId}`;
          const firstName = message.from.first_name || 'Alpha';
          const lastName = message.from.last_name || 'Wolf';
          
          // Find or create user
          let user = await User.findOne({ telegramId });
          
          if (!user) {
            // Create new user
            user = new User({
              telegramId,
              username,
              firstName,
              lastName
            });
            
            await user.save();
          }
          
          // Generate web app URL
          const webAppUrl = process.env.WEBAPP_URL || 'https://alphawolf.click';
          
          // Send welcome message with WebApp button
          await bot.sendMessage({
            chat_id: message.chat.id,
            text: `Welcome to Alpha Wulf, ${firstName}! 🐺\n\nTap to earn coins, complete tasks, play games, and win rewards!`,
            reply_markup: JSON.stringify({
              inline_keyboard: [
                [
                  {
                    text: '🚀 Launch Alpha Wulf',
                    web_app: { url: webAppUrl }
                  }
                ]
              ]
            })
          });
        }
      } catch (error) {
        console.error('Error handling message:', error);
      }
    });
    
    // Handle callback queries (button clicks)
    bot.on('callback_query', async (query) => {
      try {
        // Handle different callback data
        const callbackData = query.data;
        
        if (callbackData === 'refresh') {
          // Example: refresh user data
          const telegramId = query.from.id.toString();
          const user = await User.findOne({ telegramId });
          
          if (user) {
            await bot.answerCallbackQuery({
              callback_query_id: query.id,
              text: `Your balance: ${user.coins} coins`
            });
          } else {
            await bot.answerCallbackQuery({
              callback_query_id: query.id,
              text: 'User not found. Please restart the bot with /start'
            });
          }
        }
      } catch (error) {
        console.error('Error handling callback query:', error);
      }
    });
    
    console.log('Alpha Wulf Telegram Bot is running');
    
  } catch (error) {
    console.error('Error starting bot:', error);
  }
};

// WebApp authentication middleware
const authenticateWebApp = async (req, res, next) => {
  try {
    const initData = req.headers['x-telegram-init-data'];
    
    if (!initData) {
      return res.status(401).json({ message: 'Telegram WebApp initialization data missing' });
    }
    
    // In a real implementation, we would validate the initData
    // For now, we'll extract the user info directly
    
    // Parse initData (simplified for this example)
    const params = new URLSearchParams(initData);
    const userStr = params.get('user');
    
    if (!userStr) {
      return res.status(401).json({ message: 'User data missing from initialization data' });
    }
    
    let user;
    try {
      user = JSON.parse(userStr);
    } catch (e) {
      return res.status(401).json({ message: 'Invalid user data format' });
    }
    
    // Find or create user in our database
    const telegramId = user.id.toString();
    const username = user.username || `user${telegramId}`;
    const firstName = user.first_name || 'Alpha';
    const lastName = user.last_name || 'Wolf';
    
    let dbUser = await User.findOne({ telegramId });
    
    if (!dbUser) {
      // Create new user
      dbUser = new User({
        telegramId,
        username,
        firstName,
        lastName
      });
      
      await dbUser.save();
    }
    
    // Generate token
    const token = generateToken(dbUser);
    
    // Attach user and token to request
    req.user = dbUser;
    req.token = token;
    
    next();
  } catch (error) {
    console.error('WebApp authentication error:', error);
    res.status(500).json({ message: 'Server error during authentication' });
  }
};

module.exports = {
  bot,
  startBot,
  authenticateWebApp
};
