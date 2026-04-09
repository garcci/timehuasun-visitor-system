// backend/src/routes/deploy.js - 系统部署路由（增强版）

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { exec, spawn } = require('child_process');
const logger = require('../config/logger');
const EventEmitter = require('events');

// 部署事件发射器（用于实时日志推送）
const deployEmitter = new EventEmitter();

// 当前部署状态
let currentDeploy = {
  isActive: false,
  progress: 0,
  stage: '',
  logs: [],
  startTime: null,
  endTime: null
};

// 部署历史文件路径
const HISTORY_FILE = path.join(__dirname, '../../logs/deploy-history.json');
const BACKUP_DIR = path.join(__dirname, '../../backups');

// 配置 multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // 智能查找 uploads 目录
    const possiblePaths = [
      path.join(__dirname, '../../uploads'),           // /home/node/build-deploy/uploads
      path.join(__dirname, '../uploads'),              // /home/node/build-deploy/backend/uploads
      '/home/node/build-deploy/uploads',               // 生产环境绝对路径
      '/tmp/uploads'                                   // 备用路径
    ];
    
    let uploadDir = null;
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        uploadDir = p;
        logger.info('找到 uploads 目录', { path: p });
        break;
      }
    }
    
    // 如果都不存在，创建默认目录
    if (!uploadDir) {
      uploadDir = path.join(__dirname, '../../uploads');
      fs.mkdirSync(uploadDir, { recursive: true });
      logger.warn('创建 uploads 目录', { path: uploadDir });
    }
    
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'deploy-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// 文件过滤
const fileFilter = (req, file, cb) => {
  // 只允许 .tar.gz 和 .tgz 文件
  if (file.mimetype === 'application/gzip' || 
      file.mimetype === 'application/x-gzip' ||
      file.originalname.endsWith('.tar.gz') ||
      file.originalname.endsWith('.tgz')) {
    cb(null, true);
  } else {
    cb(new Error('只允许上传 .tar.gz 或 .tgz 格式的部署包'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024 // 限制 50MB
  }
});

/**
 * 上传部署包（增强版）
 * POST /api/admin/deploy/upload
 */
router.post('/upload', upload.single('package'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        code: 400, 
        message: '请上传部署包文件' 
      });
    }

    const packagePath = req.file.path;
    const packageSize = req.file.size;
    const packageName = req.file.filename;
    const originalName = req.file.originalname;

    // 预检：验证包的完整性
    const validationResult = await validatePackage(packagePath);
    if (!validationResult.valid) {
      // 删除无效文件
      fs.unlinkSync(packagePath);
      return res.status(400).json({ 
        code: 400, 
        message: '部署包验证失败：' + validationResult.error 
      });
    }

    logger.info('部署包已上传并通过验证', {
      path: packagePath,
      size: packageSize,
      name: packageName,
      originalName: originalName,
      validation: validationResult
    });

    res.json({
      code: 0,
      message: '部署包上传成功并通过验证',
      data: {
        path: packagePath,
        size: packageSize,
        name: packageName,
        originalName: originalName,
        validation: validationResult
      }
    });
  } catch (error) {
    logger.error('部署包上传失败', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ 
      code: 500, 
      message: '上传失败：' + errorMessage
    });
  }
});

/**
 * 验证部署包
 */
async function validatePackage(packagePath) {
  return new Promise((resolve) => {
    // 检查文件是否存在
    if (!fs.existsSync(packagePath)) {
      resolve({ valid: false, error: '文件不存在' });
      return;
    }

    // 解压并检查基本结构
    const tempDir = path.join(__dirname, '../../temp-validate-' + Date.now());
    const checkCommand = `tar -tzf ${packagePath} | head -20`;
    
    exec(checkCommand, (error, stdout, stderr) => {
      // 清理临时目录
      try {
        if (fs.existsSync(tempDir)) {
          fs.rmSync(tempDir, { recursive: true, force: true });
        }
      } catch (e) {
        // 忽略清理错误
      }

      if (error) {
        resolve({ valid: false, error: '不是有效的 tar.gz 文件' });
        return;
      }

      // 检查是否包含必要的文件
      const content = stdout.toLowerCase();
      const hasBackend = content.includes('backend/') || content.includes('package.json');
      const hasDeployScript = content.includes('deploy.sh') || content.includes('server-deploy.sh');

      if (!hasBackend) {
        resolve({ valid: false, error: '部署包缺少后端代码' });
        return;
      }

      if (!hasDeployScript) {
        resolve({ valid: false, error: '部署包缺少部署脚本' });
        return;
      }

      resolve({ 
        valid: true, 
        message: '验证通过',
        hasBackend,
        hasDeployScript
      });
    });
  });
}

/**
 * 执行部署（增强版 - 实时日志推送）
 * POST /api/admin/deploy/execute
 */
router.post('/execute', async (req, res) => {
  try {
    const { packagePath } = req.body;

    if (!packagePath) {
      return res.status(400).json({ 
        code: 400, 
        message: '请提供部署包路径' 
      });
    }

    // 检查是否有正在进行的部署
    if (currentDeploy.isActive) {
      return res.status(400).json({ 
        code: 400, 
        message: '已有部署正在进行中，请稍后再试' 
      });
    }

    // 检查文件是否存在
    if (!fs.existsSync(packagePath)) {
      return res.status(400).json({ 
        code: 400, 
        message: '部署包文件不存在' 
      });
    }

    // 初始化部署状态
    currentDeploy = {
      isActive: true,
      progress: 0,
      stage: '准备部署',
      logs: [],
      startTime: new Date().toISOString(),
      endTime: null,
      responseSent: false  // 标记响应是否已发送
    };

    // 通知客户端部署开始
    deployEmitter.emit('deploy-start', { 
      message: '部署已开始',
      timestamp: currentDeploy.startTime 
    });

    logger.info('开始执行部署', { packagePath });

    // 执行部署脚本（智能查找脚本位置）
    // 可能的脚本路径：
    // 1. 开发环境：项目根目录的 server-deploy.sh
    // 2. 生产环境：/home/node/build-deploy/server-deploy.sh
    const possiblePaths = [
      path.join(__dirname, '../../../server-deploy.sh'),
      path.join(__dirname, '../../server-deploy.sh'),
      '/home/node/build-deploy/server-deploy.sh',
      '/tmp/build-deploy/server-deploy.sh'
    ];
    
    let deployScript = null;
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        deployScript = p;
        logger.info('找到部署脚本', { path: p });
        break;
      }
    }
    
    if (!deployScript) {
      throw new Error('未找到 server-deploy.sh 部署脚本');
    }
    
    // 获取脚本所在目录
    const scriptDir = path.dirname(deployScript);
    logger.info('部署脚本目录', { path: scriptDir });
    
    // 创建临时目录用于新版本（使用 let 以便后续可以调整）
    let tempDeployDir = path.join(scriptDir, 'temp-deploy-' + Date.now());
    fs.mkdirSync(tempDeployDir, { recursive: true });
    
    logger.info('创建临时部署目录', { path: tempDeployDir });
    
    // 第一步：解压部署包到临时目录
    currentDeploy.stage = '解压部署包';
    deployEmitter.emit('deploy-progress', {
      stage: currentDeploy.stage,
      progress: 20
    });
    
    const extractCommand = `tar -xzf "${packagePath}" -C "${tempDeployDir}"`;
    logger.info('执行解压命令', { command: extractCommand });
    
    // 使用 exec 执行解压命令
    await new Promise((resolve, reject) => {
      exec(extractCommand, (error, stdout, stderr) => {
        if (error) {
          logger.error('解压失败', error);
          currentDeploy.logs.push({
            type: 'error',
            message: `❌ 解压失败：${stderr || (error instanceof Error ? error.message : String(error))}`,
            timestamp: new Date().toISOString()
          });
          deployEmitter.emit('deploy-log', currentDeploy.logs[currentDeploy.logs.length - 1]);
          reject(error);
        } else {
          logger.info('解压成功', { stdout });
          resolve();
        }
      });
    });
    
    // 检查是否有 build-deploy 子目录（打包脚本会包含这层目录）
    const buildDeployDir = path.join(tempDeployDir, 'build-deploy');
    if (fs.existsSync(buildDeployDir) && fs.statSync(buildDeployDir).isDirectory()) {
      logger.info('检测到 build-deploy 子目录，将使用该目录作为实际工作目录', { path: buildDeployDir });
      // 更新临时目录为 build-deploy 目录
      tempDeployDir = buildDeployDir;
    }
    
    currentDeploy.logs.push({
      type: 'info',
      message: '✅ 部署包解压完成',
      timestamp: new Date().toISOString()
    });
    deployEmitter.emit('deploy-log', currentDeploy.logs[currentDeploy.logs.length - 1]);
    
    // 第二步：复制部署脚本到临时目录并执行
    currentDeploy.stage = '执行部署脚本';
    deployEmitter.emit('deploy-progress', {
      stage: currentDeploy.stage,
      progress: 40
    });
    
    logger.info('准备执行部署脚本', {
      script: deployScript,
      cwd: tempDeployDir,
      exists: fs.existsSync(tempDeployDir)
    });
    
    // 检查临时目录内容
    try {
      const dirContents = fs.readdirSync(tempDeployDir);
      logger.info('临时目录完整内容', { 
        path: tempDeployDir,
        contents: dirContents,
        hasBackend: dirContents.includes('backend'),
        hasAdmin: dirContents.includes('admin'),
        hasServerDeploy: dirContents.includes('server-deploy.sh')
      });
      
      // 显示每个条目是文件还是目录
      const details = dirContents.map(item => {
        const fullPath = path.join(tempDeployDir, item);
        const isDir = fs.statSync(fullPath).isDirectory();
        return `${item} (${isDir ? '目录' : '文件'})`;
      });
      logger.info('临时目录详细结构', { details });
      
      if (!dirContents.includes('backend')) {
        const errorMsg = `部署包缺少 backend 目录！目录内容：${dirContents.join(', ')}`;
        logger.error(errorMsg);
        throw new Error(errorMsg);
      }
    } catch (e) {
      logger.error('检查临时目录失败', e);
      const errorMessage = e instanceof Error ? e.message : String(e);
      currentDeploy.logs.push({
        type: 'error',
        message: `❌ 检查临时目录失败：${errorMessage}`,
        timestamp: new Date().toISOString()
      });
      deployEmitter.emit('deploy-log', currentDeploy.logs[currentDeploy.logs.length - 1]);
      throw e;
    }
    
    // 复制部署脚本到临时目录（确保使用相对路径执行）
    const tempScriptPath = path.join(tempDeployDir, 'server-deploy.sh');
    fs.copyFileSync(deployScript, tempScriptPath);
    logger.info('已复制部署脚本到临时目录', { path: tempScriptPath });
    
    // 在临时目录中直接执行 ./server-deploy.sh
    const child = spawn('./server-deploy.sh', [], {
      cwd: tempDeployDir,
      env: { 
        ...process.env, 
        DEPLOY_PACKAGE: packagePath,
        TEMP_DEPLOY_DIR: tempDeployDir
      },
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stdoutData = '';
    let stderrData = '';

    // 处理标准输出
    child.stdout.on('data', (data) => {
      const line = data.toString();
      stdoutData += line;
      currentDeploy.logs.push({
        type: 'info',
        message: line.trim(),
        timestamp: new Date().toISOString()
      });
      
      // 实时更新进度
      updateProgress(line);
      
      // 推送日志到客户端
      deployEmitter.emit('deploy-log', {
        type: 'info',
        message: line.trim(),
        timestamp: new Date().toISOString()
      });
    });

    // 处理错误输出
    child.stderr.on('data', (data) => {
      const line = data.toString();
      stderrData += line;
      currentDeploy.logs.push({
        type: 'error',
        message: line.trim(),
        timestamp: new Date().toISOString()
      });
      
      deployEmitter.emit('deploy-log', {
        type: 'error',
        message: line.trim(),
        timestamp: new Date().toISOString()
      });
    });

    // 处理完成
    child.on('close', (code) => {
      // 如果响应已经发送，就不再发送
      if (currentDeploy.responseSent) {
        logger.info('部署完成，但响应已提前发送');
        return;
      }
      
      currentDeploy.isActive = false;
      currentDeploy.endTime = new Date().toISOString();
      currentDeploy.progress = code === 0 ? 100 : currentDeploy.progress;

      if (code === 0) {
        logger.info('部署执行成功', { stdout: stdoutData });
        
        // 记录到历史
        recordDeployHistory({
          timestamp: currentDeploy.startTime,
          endTime: currentDeploy.endTime,
          packageName: path.basename(packagePath),
          packageSize: fs.statSync(packagePath).size,
          status: 'success',
          logs: currentDeploy.logs,
          duration: new Date(currentDeploy.endTime) - new Date(currentDeploy.startTime)
        });

        // 清理旧的部署包
        try {
          fs.unlinkSync(packagePath);
        } catch (e) {
          logger.warn('清理旧部署包失败', e);
        }
        
        // 清理临时目录（延迟清理）
        setTimeout(() => {
          try {
            if (fs.existsSync(tempDeployDir)) {
              fs.rmSync(tempDeployDir, { recursive: true, force: true });
              logger.info('清理临时部署目录', { path: tempDeployDir });
            }
          } catch (e) {
            logger.warn('清理临时目录失败', e);
          }
        }, 60000);  // 1 分钟后清理

        deployEmitter.emit('deploy-complete', {
          message: '部署成功！服务正在重启...',
          stdout: stdoutData,
          stderr: stderrData
        });

        currentDeploy.responseSent = true;
        res.json({
          code: 0,
          message: '部署成功！服务已启动并验证通过',
          data: {
            stdout: stdoutData,
            stderr: stderrData,
            duration: new Date(currentDeploy.endTime) - new Date(currentDeploy.startTime),
            tempDeployDir: tempDeployDir
          }
        });
      } else {
        logger.error('部署执行失败', { code, stderr: stderrData });
        
        recordDeployHistory({
          timestamp: currentDeploy.startTime,
          endTime: currentDeploy.endTime,
          packageName: path.basename(packagePath),
          status: 'failed',
          logs: currentDeploy.logs,
          errorCode: code
        });
        
        // 清理临时目录
        try {
          if (fs.existsSync(tempDeployDir)) {
            fs.rmSync(tempDeployDir, { recursive: true, force: true });
            logger.info('清理失败的临时部署目录', { path: tempDeployDir });
          }
        } catch (e) {
          logger.warn('清理临时目录失败', e);
        }

        deployEmitter.emit('deploy-error', {
          message: '部署失败',
          error: stderrData,
          code: code
        });

        currentDeploy.responseSent = true;
        res.status(500).json({
          code: 500,
          message: '部署执行失败',
          error: stderrData || '未知错误',
          exitCode: code
        });
      }
    });

    // 注意：这里不能立即返回响应，要等待 child.on('close') 处理完成后再返回
    // 否则会导致响应发送两次的问题

  } catch (error) {
    currentDeploy.isActive = false;
    logger.error('部署请求处理失败', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ 
      code: 500, 
      message: '部署失败：' + errorMessage
    });
  }
});

/**
 * 更新部署进度
 */
function updateProgress(logLine) {
  const line = logLine.toLowerCase();
  
  if (line.includes('依赖')) currentDeploy.progress = 20;
  if (line.includes('构建')) currentDeploy.progress = 40;
  if (line.includes('停止旧服务')) currentDeploy.progress = 60;
  if (line.includes('启动服务')) currentDeploy.progress = 80;
  if (line.includes('健康检查')) currentDeploy.progress = 95;
  if (line.includes('部署完成')) currentDeploy.progress = 100;
}

/**
 * 记录部署历史
 */
function recordDeployHistory(record) {
  try {
    let history = [];
    if (fs.existsSync(HISTORY_FILE)) {
      const content = fs.readFileSync(HISTORY_FILE, 'utf8');
      history = JSON.parse(content);
    }

    history.push(record);
    
    // 只保留最近 50 条记录
    if (history.length > 50) {
      history = history.slice(-50);
    }

    fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
  } catch (error) {
    logger.error('记录部署历史失败', error);
  }
}

/**
 * 获取部署实时日志（Server-Sent Events）
 * GET /api/admin/deploy/logs
 */
router.get('/logs', (req, res) => {
  // 设置 SSE 头
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  // 发送当前状态
  res.write(`data: ${JSON.stringify({ 
    type: 'init',
    deploy: currentDeploy 
  })}\n\n`);

  // 监听部署事件
  const onLog = (log) => {
    res.write(`data: ${JSON.stringify(log)}\n\n`);
  };

  const onStart = (data) => {
    res.write(`data: ${JSON.stringify({ type: 'start', ...data })}\n\n`);
  };

  const onComplete = (data) => {
    res.write(`data: ${JSON.stringify({ type: 'complete', ...data })}\n\n`);
    res.end();
  };

  const onError = (data) => {
    res.write(`data: ${JSON.stringify({ type: 'error', ...data })}\n\n`);
    res.end();
  };

  // 绑定事件监听器
  deployEmitter.on('deploy-log', onLog);
  deployEmitter.on('deploy-start', onStart);
  deployEmitter.on('deploy-complete', onComplete);
  deployEmitter.on('deploy-error', onError);

  // 客户端断开时清理
  req.on('close', () => {
    deployEmitter.removeListener('deploy-log', onLog);
    deployEmitter.removeListener('deploy-start', onStart);
    deployEmitter.removeListener('deploy-complete', onComplete);
    deployEmitter.removeListener('deploy-error', onError);
  });
});

/**
 * 获取部署状态
 * GET /api/admin/deploy/status
 */
router.get('/status', (req, res) => {
  res.json({
    code: 0,
    data: {
      isActive: currentDeploy.isActive,
      progress: currentDeploy.progress,
      stage: currentDeploy.stage,
      logs: currentDeploy.logs.slice(-50), // 返回最近 50 条日志
      startTime: currentDeploy.startTime,
      endTime: currentDeploy.endTime
    }
  });
});
router.get('/history', async (req, res) => {
  try {
    const historyFile = path.join(__dirname, '../../logs/deploy-history.json');
    
    let history = [];
    if (fs.existsSync(historyFile)) {
      const content = fs.readFileSync(historyFile, 'utf8');
      history = JSON.parse(content);
    }

    // 返回最近 20 条记录
    res.json({
      code: 0,
      data: history.slice(-20).reverse()
    });
  } catch (error) {
    logger.error('获取部署历史失败', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ 
      code: 500, 
      message: '获取历史失败：' + errorMessage
    });
  }
});

/**
 * 回滚到上一个版本
 * POST /api/admin/deploy/rollback
 */
router.post('/rollback', async (req, res) => {
  try {
    // 检查是否有备份
    if (!fs.existsSync(BACKUP_DIR)) {
      return res.status(400).json({ 
        code: 400, 
        message: '没有可用的备份' 
      });
    }

    // 获取最新的备份
    const backups = fs.readdirSync(BACKUP_DIR)
      .filter(file => file.endsWith('.tar.gz'))
      .sort().reverse();

    if (backups.length === 0) {
      return res.status(400).json({ 
        code: 400, 
        message: '没有可用的备份文件' 
      });
    }

    const latestBackup = path.join(BACKUP_DIR, backups[0]);
    
    logger.info('开始回滚', { backup: latestBackup });

    // TODO: 实现回滚逻辑

    res.json({
      code: 0,
      message: '回滚功能开发中，当前请使用手动回滚',
      data: {
        backupPath: latestBackup,
        hint: '可以手动上传此备份文件进行回滚'
      }
    });
  } catch (error) {
    logger.error('回滚失败', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ 
      code: 500, 
      message: '回滚失败：' + errorMessage
    });
  }
});

/**
 * 版本对比
 * GET /api/admin/deploy/compare
 */
router.get('/compare', async (req, res) => {
  try {
    const { version1, version2 } = req.query;

    // TODO: 实现版本对比逻辑

    res.json({
      code: 0,
      data: {
        currentVersion: '1.0.0',
        targetVersion: '1.0.1',
        changes: [
          { type: 'added', description: '数据库自动初始化功能' },
          { type: 'improved', description: '优化部署日志实时推送' },
          { type: 'fixed', description: '修复健康检查接口 404 问题' }
        ]
      }
    });
  } catch (error) {
    logger.error('版本对比失败', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ 
      code: 500, 
      message: '版本对比失败：' + errorMessage
    });
  }
});

/**
 * 检查系统更新
 * GET /api/admin/deploy/check-update
 */
router.get('/check-update', async (req, res) => {
  try {
    // 这里可以集成到远程更新服务器
    // 暂时返回当前版本信息
    const packageJsonPath = path.join(__dirname, '../../package.json');
    
    let version = '1.0.0';
    if (fs.existsSync(packageJsonPath)) {
      const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      version = pkg.version || '1.0.0';
    }

    res.json({
      code: 0,
      data: {
        currentVersion: version,
        hasUpdate: false,
        message: '当前已是最新版本'
      }
    });
  } catch (error) {
    logger.error('检查更新失败', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ 
      code: 500, 
      message: '检查更新失败：' + errorMessage
    });
  }
});

module.exports = router;
