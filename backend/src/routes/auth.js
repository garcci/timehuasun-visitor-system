const express = require('express');
const router = express.Router();
const axios = require('axios');

/**
 * 微信登录接口
 * POST /api/auth/login
 * 
 * 请求参数:
 * {
 *   "code": "微信登录code"
 * }
 * 
 * 返回:
 * {
 *   "openid": "用户openid",
 *   "session_key": "会话密钥"
 * }
 */
router.post('/login', async (req, res) => {
  try {
    const { code } = req.body;
    
    if (!code) {
      return res.status(400).json({
        success: false,
        message: '缺少 code 参数'
      });
    }
    
    // 微信小程序配置
    const appid = process.env.WECHAT_APPID || 'wx667f73ed40e66026';
    const secret = process.env.WECHAT_APP_SECRET;
    
    if (!secret) {
      console.error('❌ WECHAT_APP_SECRET 未配置');
      return res.status(500).json({
        success: false,
        message: '服务器配置错误'
      });
    }
    
    console.log('🔐 正在调用微信登录接口...');
    console.log('AppID:', appid);
    
    // 调用微信接口换取 openid
    const result = await axios.get(
      'https://api.weixin.qq.com/sns/jscode2session',
      {
        params: {
          appid,
          secret,
          js_code: code,
          grant_type: 'authorization_code'
        },
        timeout: 10000
      }
    );
    
    const data = result.data;
    
    if (data.errcode) {
      console.error('❌ 微信登录失败:', data);
      return res.status(400).json({
        success: false,
        message: data.errmsg || '微信登录失败',
        errcode: data.errcode
      });
    }
    
    console.log('✅ 微信登录成功');
    console.log('OpenID:', data.openid);
    
    // 返回 openid 和 session_key
    res.json({
      success: true,
      data: {
        openid: data.openid,
        session_key: data.session_key
      }
    });
    
  } catch (error) {
    console.error('❌ 微信登录异常:', error.message);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

/**
 * 微信手机号解密接口
 * POST /api/auth/decode-phone
 * 
 * 请求参数:
 * {
 *   "code": "微信手机号授权code"
 * }
 * 
 * 返回:
 * {
 *   "phoneNumber": "手机号"
 * }
 */
router.post('/decode-phone', async (req, res) => {
  try {
    const { code } = req.body;
    
    if (!code) {
      return res.status(400).json({
        success: false,
        message: '缺少 code 参数'
      });
    }
    
    // 获取 access_token
    const appid = process.env.WECHAT_APPID || 'wx667f73ed40e66026';
    const secret = process.env.WECHAT_APP_SECRET;
    
    if (!secret) {
      console.error('❌ WECHAT_APP_SECRET 未配置');
      return res.status(500).json({
        success: false,
        message: '服务器配置错误'
      });
    }
    
    console.log('📱 正在获取 access_token...');
    
    // 第一步：获取 access_token
    const tokenResult = await axios.get(
      'https://api.weixin.qq.com/cgi-bin/token',
      {
        params: {
          grant_type: 'client_credential',
          appid,
          secret
        },
        timeout: 10000
      }
    );
    
    const accessToken = tokenResult.data.access_token;
    
    if (!accessToken) {
      console.error('❌ 获取 access_token 失败:', tokenResult.data);
      return res.status(500).json({
        success: false,
        message: '获取 access_token 失败'
      });
    }
    
    console.log('✅ 获取 access_token 成功');
    console.log('📱 正在调用微信手机号接口...');
    
    // 第二步：使用 code 换取手机号
    const phoneResult = await axios.post(
      `https://api.weixin.qq.com/wxa/business/getuserphonenumber?access_token=${accessToken}`,
      { code },
      {
        timeout: 10000
      }
    );
    
    const data = phoneResult.data;
    
    if (data.errcode !== 0) {
      console.error('❌ 获取手机号失败:', data);
      return res.status(400).json({
        success: false,
        message: data.errmsg || '获取手机号失败',
        errcode: data.errcode
      });
    }
    
    console.log('✅ 获取手机号成功');
    console.log('手机号:', data.phone_info.phoneNumber);
    
    // 返回手机号
    res.json({
      success: true,
      data: {
        phoneNumber: data.phone_info.phoneNumber,
        purePhoneNumber: data.phone_info.purePhoneNumber,
        countryCode: data.phone_info.countryCode
      }
    });
    
  } catch (error) {
    console.error('❌ 获取手机号异常:', error.message);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

module.exports = router;
