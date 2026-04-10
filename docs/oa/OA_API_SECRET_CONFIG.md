# OA API 签名密钥配置说明

## 🔑 当前密钥信息

**生成时间**: 2026-04-07 15:17  
**密钥类型**: 64位十六进制字符串（256位）  
**密钥值**: 
```
e8d7ef9ebcba0f4de997e595cd3b1e2f54ebe89db2b3b87f5168b2edf6183215
```

---

## 📋 密钥用途

该密钥用于 **OA 审批回调接口的签名验证**，确保请求来自合法的 OA 系统。

### 使用场景

1. **OA 系统调用访客系统**
   - OA 系统在发送审批结果回调时，使用该密钥生成签名
   - 访客系统收到请求后，使用相同密钥验证签名

2. **签名算法**
   ```
   1. 将参数按 key 字典序排序
   2. 拼接成 key1=value1&key2=value2... 格式
   3. 在末尾追加密钥
   4. 对最终字符串进行 MD5 加密
   5. 转为大写
   ```

---

## 🔧 配置位置

### 后端配置文件

**文件路径**: `/home/node/visitor/auto-deploy/current/backend/.env`

**配置项**:
```bash
OA_API_SECRET=e8d7ef9ebcba0f4de997e595cd3b1e2f54ebe89db2b3b87f5168b2edf6183215
```

### 代码引用

**文件**: `backend/src/config/index.js`
```javascript
oa: {
  apiKey: process.env.OA_API_KEY || '',
  apiSecret: process.env.OA_API_SECRET || '',  // ← 这里读取
  // ...
}
```

**文件**: `backend/src/services/oa.service.js`
```javascript
generateSign(data) {
  const sortedKeys = Object.keys(data).sort();
  const str = sortedKeys.map(key => `${key}=${data[key]}`).join('&') + config.oa.apiSecret;
  return crypto.createHash('md5').update(str).digest('hex').toUpperCase();
}
```

---

## 🛠️ 如何修改密钥

### 方法1：自动生成（推荐）

```bash
# SSH 登录服务器
ssh visitor

# 生成新的随机密钥
NEW_SECRET=$(openssl rand -hex 32)
echo "新密钥: $NEW_SECRET"

# 更新配置文件
sed -i "s/^OA_API_SECRET=.*/OA_API_SECRET=$NEW_SECRET/" /home/node/visitor/auto-deploy/current/backend/.env

# 重启服务
pkill -9 node && sleep 2
cd /home/node/visitor/auto-deploy/current/backend
nohup node src/index.js >> backend.log 2>&1 &

# 验证
ps aux | grep 'node src' | grep -v grep
```

### 方法2：手动设置

```bash
# SSH 登录服务器
ssh visitor

# 编辑配置文件
vi /home/node/visitor/auto-deploy/current/backend/.env

# 找到这一行并修改
OA_API_SECRET=your_new_secret_key_here

# 保存退出后重启服务
pkill -9 node && sleep 2
cd /home/node/visitor/auto-deploy/current/backend
nohup node src/index.js >> backend.log 2>&1 &
```

### 方法3：使用强密码生成器

```bash
# 生成包含字母、数字、特殊字符的密钥
openssl rand -base64 32

# 或
cat /dev/urandom | tr -dc 'a-zA-Z0-9!@#$%^&*' | fold -w 32 | head -n 1
```

---

## 📤 提供给 OA 系统

将以下信息提供给 OA 系统开发人员：

### 1. 回调接口地址

```
POST https://visitor.timehuasun.cn:8021/api/visitors/callback/approval
```

### 2. 签名密钥

```
e8d7ef9ebcba0f4de997e595cd3b1e2f54ebe89db2b3b87f5168b2edf6183215
```

### 3. 签名算法示例（Java）

```java
import java.security.MessageDigest;
import java.util.TreeMap;

public class SignUtil {
    public static String generateSign(TreeMap<String, Object> params, String secret) {
        StringBuilder sb = new StringBuilder();
        for (Map.Entry<String, Object> entry : params.entrySet()) {
            if (sb.length() > 0) sb.append("&");
            sb.append(entry.getKey()).append("=").append(entry.getValue());
        }
        sb.append(secret);
        
        MessageDigest md = MessageDigest.getInstance("MD5");
        byte[] digest = md.digest(sb.toString().getBytes("UTF-8"));
        
        StringBuilder hex = new StringBuilder();
        for (byte b : digest) {
            String h = Integer.toHexString(0xff & b);
            if (h.length() == 1) hex.append('0');
            hex.append(h);
        }
        return hex.toString().toUpperCase();
    }
}
```

### 4. 请求示例

```bash
curl -X POST https://visitor.timehuasun.cn:8021/api/visitors/callback/approval \
  -H "Content-Type: application/json" \
  -H "X-OA-Signature: A1B2C3D4E5F6..." \
  -d '{
    "oaFlowId": "KM_FLOW_20260407_001",
    "status": "approved",
    "approvalTime": "2026-04-07 15:00:00",
    "sign": "A1B2C3D4E5F6..."
  }'
```

---

## 🔒 安全建议

### 1. 密钥强度

✅ **当前密钥**: 64位十六进制（256位熵）  
✅ **安全性**: 非常高，暴力破解几乎不可能

### 2. 密钥管理

- ✅ 不要硬编码到代码中
- ✅ 使用环境变量存储
- ✅ 不要提交到版本控制系统
- ✅ 定期更换（建议每 6-12 个月）
- ✅ 不同环境使用不同密钥

### 3. .gitignore 配置

确保 `.env` 文件不被提交：

```bash
# .gitignore
.env
*.env.local
```

### 4. 访问控制

- 限制服务器 SSH 访问权限
- 使用密钥认证而非密码
- 启用防火墙，只允许必要端口
- 定期审计日志

---

## 🧪 测试签名

### 测试数据

```javascript
const data = {
  oaFlowId: "KM_FLOW_TEST_001",
  status: "approved",
  approvalTime: "2026-04-07 15:00:00"
};

const secret = "e8d7ef9ebcba0f4de997e595cd3b1e2f54ebe89db2b3b87f5168b2edf6183215";
```

### 计算步骤

```javascript
// 1. 排序
sortedKeys = ['approvalTime', 'oaFlowId', 'status']

// 2. 拼接
str = "approvalTime=2026-04-07 15:00:00&oaFlowId=KM_FLOW_TEST_001&status=approved"

// 3. 追加密钥
signStr = str + secret

// 4. MD5 加密
signature = MD5(signStr).toUpperCase()

// 5. 结果
// 例如: "A1B2C3D4E5F6789012345678901234AB"
```

### 在线验证工具

可以使用在线 MD5 工具验证：
1. 访问 https://www.md5online.org/
2. 输入拼接后的字符串
3. 对比生成的 MD5 值

---

## 🐛 常见问题

### Q1: 签名验证失败怎么办？

**可能原因**:
1. 密钥不一致（OA 系统和访客系统使用了不同的密钥）
2. 参数顺序错误
3. 参数值包含特殊字符未正确处理
4. 大小写不一致

**解决方法**:
```bash
# 1. 检查服务器配置
ssh visitor "cat /home/node/visitor/auto-deploy/current/backend/.env | grep OA_API_SECRET"

# 2. 查看日志
ssh visitor "tail -50 /home/node/visitor/auto-deploy/current/backend/backend.log | grep -i '签名\|signature'"

# 3. 重新生成密钥并同步给 OA 系统
```

### Q2: 如何确认密钥已生效？

```bash
# 1. 检查配置文件
ssh visitor "grep OA_API_SECRET /home/node/visitor/auto-deploy/current/backend/.env"

# 2. 重启服务
ssh visitor "pkill -9 node && sleep 2 && cd /home/node/visitor/auto-deploy/current/backend && nohup node src/index.js >> backend.log 2>&1 &"

# 3. 查看启动日志
ssh visitor "tail -20 /home/node/visitor/auto-deploy/current/backend/backend.log"
```

### Q3: 密钥泄露了怎么办？

**紧急处理步骤**:

1. **立即生成新密钥**
   ```bash
   NEW_SECRET=$(openssl rand -hex 32)
   ssh visitor "sed -i 's/^OA_API_SECRET=.*/OA_API_SECRET=$NEW_SECRET/' /home/node/visitor/auto-deploy/current/backend/.env"
   ssh visitor "pkill -9 node && sleep 2 && cd /home/node/visitor/auto-deploy/current/backend && nohup node src/index.js >> backend.log 2>&1 &"
   ```

2. **通知 OA 系统更新密钥**
   - 提供新密钥
   - 要求立即更新配置

3. **检查日志**
   ```bash
   ssh visitor "grep '签名验证失败' /home/node/visitor/auto-deploy/current/backend/backend.log | tail -20"
   ```

4. **评估影响**
   - 检查是否有异常请求
   - 必要时临时禁用回调接口

---

## 📊 密钥轮换计划

### 建议周期

| 环境 | 轮换周期 | 说明 |
|------|---------|------|
| 生产环境 | 6-12 个月 | 定期更换 |
| 测试环境 | 3-6 个月 | 可以更频繁 |
| 开发环境 | 按需 | 方便调试 |

### 轮换流程

1. **准备阶段**
   - 生成新密钥
   - 通知相关团队
   - 准备回滚方案

2. **执行阶段**
   - 更新 OA 系统配置
   - 更新访客系统配置
   - 重启服务

3. **验证阶段**
   - 测试签名验证
   - 检查日志
   - 确认功能正常

4. **清理阶段**
   - 删除旧密钥记录
   - 更新文档
   - 通知相关人员

---

## 📞 技术支持

如有问题，请联系：

- **项目负责人**: [填写负责人]
- **运维团队**: [填写联系方式]
- **文档版本**: v1.0
- **最后更新**: 2026-04-07 15:17

---

## ✅ 检查清单

密钥配置完成后请确认：

- [ ] 密钥已生成并保存到 `.env` 文件
- [ ] 服务已重启
- [ ] OA 系统已获得密钥
- [ ] OA 系统已配置密钥
- [ ] 签名验证测试通过
- [ ] 日志中无签名错误
- [ ] 密钥已妥善备份
- [ ] 文档已更新

---

**当前状态**: ✅ 密钥已配置并生效  
**下次轮换**: 2026-10-07（建议）
