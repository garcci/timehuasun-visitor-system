// backend/src/database/mongodb.js - MongoDB 数据库配置

const mongoose = require('mongoose');

/**
 * 连接 MongoDB 数据库
 */
async function connectDB() {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/visitor-system';
    
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ MongoDB 数据库连接成功');
  } catch (error) {
    console.error('❌ MongoDB 数据库连接失败:', error.message);
    throw error;
  }
}

/**
 * 关闭数据库连接
 */
async function closeDB() {
  try {
    await mongoose.connection.close();
    console.log('🔒 MongoDB 数据库连接已关闭');
  } catch (error) {
    console.error('关闭数据库连接失败:', error.message);
  }
}

module.exports = {
  connectDB,
  closeDB,
};
