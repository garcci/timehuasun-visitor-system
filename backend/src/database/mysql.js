// backend/src/database/mysql.js - MySQL 数据库配置

const mysql = require('mysql2/promise');

let pool;

/**
 * 初始化数据库连接池（懒加载模式）
 * 启动时不检查连接，只在首次访问时建立连接
 */
async function initDB() {
  try {
    pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'visitor_system',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0
    });

    console.log('✅ MySQL 数据库连接池已配置（将在首次访问时建立连接）');
    
    // 自动检查并创建数据库和表
    await autoCreateDatabaseAndTables();
    
    return pool;
  } catch (error) {
    console.error('❌ MySQL 数据库连接池创建失败:', error.message);
    throw error;
  }
}

/**
 * 自动创建数据库和表（如果不存在）
 */
async function autoCreateDatabaseAndTables() {
  try {
    // 先创建一个不带 database 参数的连接，用于检查和创建数据库
    const tempConnection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || ''
    });

    const dbName = process.env.DB_NAME || 'visitor_system';
    
    // 检查数据库是否存在
    const [dbs] = await tempConnection.query(
      `SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = ?`,
      [dbName]
    );

    if (dbs.length === 0) {
      // 数据库不存在，创建它
      await tempConnection.query(
        `CREATE DATABASE IF NOT EXISTS ${dbName} ` +
        `DEFAULT CHARACTER SET utf8mb4 ` +
        `DEFAULT COLLATE utf8mb4_unicode_ci`
      );
      console.log(`✅ 数据库 '${dbName}' 创建成功`);
    } else {
      console.log(`ℹ️  数据库 '${dbName}' 已存在`);
    }

    await tempConnection.end();

    // 现在使用正确的数据库连接
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: dbName
    });

    // 创建访客申请表
    await connection.query(`
      CREATE TABLE IF NOT EXISTS visitor_applications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(50) NOT NULL COMMENT '访客姓名',
        phone VARCHAR(20) NOT NULL COMMENT '手机号',
        company VARCHAR(100) COMMENT '工作单位',
        purpose TEXT COMMENT '来访目的',
        visit_date DATE NOT NULL COMMENT '预计来访日期',
        host_name VARCHAR(50) NOT NULL COMMENT '被访人姓名',
        host_phone VARCHAR(20) NOT NULL COMMENT '被访人手机号',
        host_department VARCHAR(100) COMMENT '被访人部门',
        status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending' COMMENT '审批状态',
        oa_flow_id VARCHAR(100) COMMENT 'OA 审批单号',
        qr_code TEXT COMMENT '访客二维码',
        companions JSON COMMENT '随行人员信息',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
        INDEX idx_phone (phone),
        INDEX idx_status (status),
        INDEX idx_visit_date (visit_date)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='访客申请表'
    `);
    console.log('✅ 表 visitor_applications 创建成功或已存在');

    // 创建访客同行人员表
    await connection.query(`
      CREATE TABLE IF NOT EXISTS visitor_companions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        application_id INT NOT NULL COMMENT '访客申请 ID',
        name VARCHAR(50) NOT NULL COMMENT '同行人员姓名',
        phone VARCHAR(20) COMMENT '手机号',
        company VARCHAR(100) COMMENT '工作单位',
        FOREIGN KEY (application_id) REFERENCES visitor_applications(id) ON DELETE CASCADE,
        INDEX idx_application_id (application_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='访客同行人员表'
    `);
    console.log('✅ 表 visitor_companions 创建成功或已存在');

    // 检查是否有测试数据
    const [rows] = await connection.query('SELECT COUNT(*) as count FROM visitor_applications');
    if (rows[0].count === 0) {
      // 插入测试数据
      await connection.query(`
        INSERT INTO visitor_applications 
        (name, phone, company, purpose, visit_date, host_name, host_phone, host_department, status) 
        VALUES
        ('张三', '13800138001', '某某科技公司', '技术交流', '2026-04-05', '李经理', '13900139001', '技术部', 'approved'),
        ('王芳', '13800138002', '设计研究院', '项目洽谈', '2026-04-06', '王总监', '13900139002', '市场部', 'pending')
      `);
      console.log('✅ 测试数据插入成功');
    }

    await connection.end();
    console.log('🎉 数据库初始化完成！');
  } catch (error) {
    console.error('⚠️  数据库自动初始化失败:', error.message);
    console.error('   请手动执行以下 SQL 创建数据库和表:');
    console.error('   CREATE DATABASE IF NOT EXISTS visitor_system DEFAULT CHARACTER SET utf8mb4;');
    console.error('   USE visitor_system;');
    console.error('   -- 然后执行建表语句（见日志或文档）');
    // 不抛出异常，避免启动失败
  }
}

/**
 * 获取数据库连接池（自动初始化）
 */
function getPool() {
  if (!pool) {
    // 如果未初始化，自动调用 initDB
    console.warn('⚠️  数据库连接池未初始化，正在自动创建...');
    initDB().catch(err => {
      console.error('自动初始化数据库失败:', err);
    });
    return null; // 返回 null，由 query 方法处理
  }
  return pool;
}

/**
 * 执行查询（带重试机制）
 */
async function query(sql, params = []) {
  let retryCount = 0;
  const maxRetries = 3;
  
  while (retryCount < maxRetries) {
    try {
      // 确保连接池存在
      if (!pool) {
        await initDB();
      }
      
      const connection = await pool.getConnection();
      try {
        const [rows] = await connection.execute(sql, params);
        return rows;
      } finally {
        connection.release();
      }
    } catch (error) {
      retryCount++;
      
      // 如果是连接错误，尝试重新初始化
      if (error.code === 'ER_ACCESS_DENIED_ERROR' || 
          error.code === 'ECONNREFUSED' || 
          error.code === 'PROTOCOL_CONNECTION_LOST') {
        
        if (retryCount < maxRetries) {
          console.warn(`⚠️  数据库连接失败，${maxRetries - retryCount}秒后重试 (${retryCount}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
          pool = null; // 重置连接池，强制重新初始化
          continue;
        }
      }
      
      // 超过重试次数或不是连接错误，抛出异常
      throw error;
    }
  }
  
  throw new Error('数据库查询失败，已达到最大重试次数');
}

/**
 * 关闭数据库连接
 */
async function closeDB() {
  try {
    if (pool) {
      await pool.end();
      console.log('🔒 MySQL 数据库连接已关闭');
    }
  } catch (error) {
    console.error('关闭数据库连接失败:', error.message);
  }
}

module.exports = {
  initDB,
  getPool,
  query,
  closeDB
};
