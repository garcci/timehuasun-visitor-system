// backend/src/middleware/auth.ts - 微信登录认证中间件

import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { config } from '../config'

export interface AuthUser {
  openid: string
  sessionKey?: string
  isAdmin?: boolean
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser
    }
  }
}

/**
 * 验证 JWT Token
 */
export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // 从请求头获取 token
    const token = req.headers.authorization?.replace('Bearer ', '')
    
    if (!token) {
      res.status(401).json({
        code: 401,
        message: '未提供认证令牌',
      })
      return
    }
    
    // 验证 token
    const decoded = jwt.verify(token, config.jwt.secret) as AuthUser
    req.user = decoded
    
    next()
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        code: 401,
        message: '认证令牌已过期',
      })
      return
    }
    
    res.status(401).json({
      code: 401,
      message: '无效的认证令牌',
    })
    return
  }
}

/**
 * 可选认证（不强制要求登录）
 */
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '')
    
    if (token) {
      const decoded = jwt.verify(token, config.jwt.secret) as AuthUser
      req.user = decoded
    }
  } catch (error) {
    // 忽略错误，继续执行
  }
  
  next()
}
