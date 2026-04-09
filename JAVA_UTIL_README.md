# Java 工具类使用说明

## 📦 文件说明

**文件名**: `VisitorCallbackUtil.java`  
**包名**: `com.oa.visitor.callback`  
**用途**: OA系统调用访客系统审批回调接口的Java工具类

---

## 🚀 快速开始

### 步骤1：修改配置

打开 `VisitorCallbackUtil.java` 文件，找到第 34 行：

```java
private static final String API_SECRET = "your_api_secret_key_here";
```

将 `"your_api_secret_key_here"` 替换为实际的 API 密钥（从访客系统管理员获取）。

### 步骤2：编译

```bash
javac VisitorCallbackUtil.java
```

如果指定了包名：

```bash
mkdir -p com/oa/visitor/callback
mv VisitorCallbackUtil.java com/oa/visitor/callback/
javac com/oa/visitor/callback/VisitorCallbackUtil.java
```

### 步骤3：运行测试

```bash
java com.oa.visitor.callback.VisitorCallbackUtil
```

---

## 💻 集成到 OA 系统

### 方式1：直接复制类

将 `VisitorCallbackUtil.java` 复制到您的 OA 项目源码目录中。

### 方式2：作为工具类引用

```java
import com.oa.visitor.callback.VisitorCallbackUtil;
import com.oa.visitor.callback.VisitorCallbackUtil.CallbackResult;

public class ApprovalService {
    
    /**
     * 审批完成后回调访客系统
     */
    public void notifyVisitorSystem(String oaFlowId, boolean approved, String rejectReason) {
        try {
            CallbackResult result = VisitorCallbackUtil.sendApprovalCallback(
                    null,                           // applicationId（可选）
                    oaFlowId,                       // oaFlowId（必填）
                    approved ? "approved" : "rejected",  // status
                    getCurrentTime(),               // approvalTime
                    approved ? null : rejectReason, // rejectReason
                    getCurrentUser().getName(),     // approverName
                    getCurrentUser().getPhone()     // approverPhone
            );
            
            if (result.isSuccess()) {
                logger.info("访客系统回调成功: " + result.getResponseBody());
            } else {
                logger.error("访客系统回调失败: " + result.getResponseBody());
            }
            
        } catch (Exception e) {
            logger.error("调用访客系统回调接口异常", e);
        }
    }
    
    private String getCurrentTime() {
        return new java.text.SimpleDateFormat("yyyy-MM-dd HH:mm:ss")
                .format(new java.util.Date());
    }
}
```

---

## 📝 API 说明

### 主要方法

```java
/**
 * 发送审批回调
 * 
 * @param applicationId 访客申请ID（可选，如果提供则优先使用）
 * @param oaFlowId OA流程ID（必填）
 * @param status 审批状态："approved" 或 "rejected"
 * @param approvalTime 审批时间，格式：yyyy-MM-dd HH:mm:ss
 * @param rejectReason 拒绝原因（仅当 status="rejected" 时必填）
 * @param approverName 审批人姓名（可选）
 * @param approverPhone 审批人电话（可选）
 * @return CallbackResult 回调结果
 * @throws Exception 参数验证失败或网络异常
 */
public static CallbackResult sendApprovalCallback(
        String applicationId,
        String oaFlowId,
        String status,
        String approvalTime,
        String rejectReason,
        String approverName,
        String approverPhone) throws Exception
```

### 返回对象

```java
public class CallbackResult {
    private boolean success;      // 是否成功
    private int responseCode;     // HTTP 响应码
    private String responseBody;  // 响应体（JSON字符串）
    
    // getter/setter 方法...
}
```

---

## 🧪 使用示例

### 示例1：审批通过

```java
try {
    CallbackResult result = VisitorCallbackUtil.sendApprovalCallback(
            "8c0f0d47-b1ea-4cc6-bf9b-93eb00312662",  // applicationId
            "KM_FLOW_20260407_001",                    // oaFlowId
            "approved",                                 // status
            "2026-04-07 14:30:00",                     // approvalTime
            null,                                       // rejectReason
            "张三",                                     // approverName
            "13800138000"                              // approverPhone
    );
    
    if (result.isSuccess()) {
        System.out.println("✅ 回调成功");
        System.out.println("响应: " + result.getResponseBody());
    } else {
        System.out.println("❌ 回调失败");
        System.out.println("错误: " + result.getResponseBody());
    }
} catch (Exception e) {
    System.err.println("异常: " + e.getMessage());
    e.printStackTrace();
}
```

### 示例2：审批拒绝

```java
try {
    CallbackResult result = VisitorCallbackUtil.sendApprovalCallback(
            null,                                        // applicationId（不传）
            "KM_FLOW_20260407_002",                    // oaFlowId
            "rejected",                                  // status
            "2026-04-07 15:00:00",                     // approvalTime
            "来访时间冲突，请重新预约",                   // rejectReason（必填）
            "李四",                                     // approverName
            "13900139000"                              // approverPhone
    );
    
    System.out.println("响应码: " + result.getResponseCode());
    System.out.println("响应体: " + result.getResponseBody());
    
} catch (IllegalArgumentException e) {
    // 参数验证失败
    System.err.println("参数错误: " + e.getMessage());
} catch (Exception e) {
    // 网络异常或其他错误
    System.err.println("调用失败: " + e.getMessage());
}
```

### 示例3：在 Spring Boot 中使用

```java
@Service
public class VisitorApprovalService {
    
    @Autowired
    private Logger logger;
    
    /**
     * OA 审批完成后的回调处理
     */
    public void onApprovalComplete(String oaFlowId, boolean approved, String reason) {
        // 异步调用，不阻塞主流程
        CompletableFuture.runAsync(() -> {
            try {
                CallbackResult result = VisitorCallbackUtil.sendApprovalCallback(
                        null,
                        oaFlowId,
                        approved ? "approved" : "rejected",
                        getCurrentTime(),
                        approved ? null : reason,
                        SecurityUtils.getCurrentUser().getName(),
                        SecurityUtils.getCurrentUser().getPhone()
                );
                
                if (result.isSuccess()) {
                    logger.info("访客系统回调成功, flowId={}, result={}", 
                            oaFlowId, result.getResponseBody());
                } else {
                    logger.warn("访客系统回调失败, flowId={}, code={}, body={}", 
                            oaFlowId, result.getResponseCode(), result.getResponseBody());
                }
                
            } catch (Exception e) {
                logger.error("访客系统回调异常, flowId=" + oaFlowId, e);
            }
        });
    }
    
    private String getCurrentTime() {
        return LocalDateTime.now()
                .format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
    }
}
```

---

## ⚙️ 配置项说明

| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| CALLBACK_URL | `https://visitor.timehuasun.cn:8021/api/visitors/callback/approval` | 回调接口地址 |
| API_SECRET | `your_api_secret_key_here` | API 密钥（必须修改） |
| CONNECT_TIMEOUT | `5000` | 连接超时（毫秒） |
| READ_TIMEOUT | `10000` | 读取超时（毫秒） |

### 修改配置

```java
// 方式1：直接修改常量
private static final String API_SECRET = "actual_secret_key";

// 方式2：从环境变量读取
private static final String API_SECRET = System.getenv("OA_API_SECRET");

// 方式3：从配置文件读取
private static final String API_SECRET = PropertiesLoader.getProperty("oa.api.secret");
```

---

## 🔒 安全建议

### 1. 密钥管理

**❌ 不要硬编码**
```java
private static final String API_SECRET = "my_secret_key";  // 不安全
```

**✅ 推荐做法**
```java
// 从环境变量读取
private static final String API_SECRET = System.getenv("OA_API_SECRET");

// 或从加密配置文件读取
private static final String API_SECRET = ConfigManager.getEncryptedProperty("oa.api.secret");
```

### 2. 异常处理

```java
try {
    CallbackResult result = VisitorCallbackUtil.sendApprovalCallback(...);
    // 处理结果
} catch (IllegalArgumentException e) {
    // 参数错误，记录日志
    logger.error("参数验证失败", e);
} catch (Exception e) {
    // 网络异常，可以重试
    logger.error("回调失败，将稍后重试", e);
    retryLater();
}
```

### 3. 重试机制

```java
public CallbackResult sendWithRetry(String oaFlowId, String status, int maxRetries) {
    Exception lastException = null;
    
    for (int i = 0; i < maxRetries; i++) {
        try {
            return VisitorCallbackUtil.sendApprovalCallback(
                    null, oaFlowId, status, getCurrentTime(), 
                    null, null, null
            );
        } catch (Exception e) {
            lastException = e;
            logger.warn("第{}次重试失败", i + 1, e);
            
            if (i < maxRetries - 1) {
                try {
                    Thread.sleep(1000 * (i + 1)); // 递增延迟
                } catch (InterruptedException ie) {
                    Thread.currentThread().interrupt();
                    break;
                }
            }
        }
    }
    
    throw new RuntimeException("重试" + maxRetries + "次后仍然失败", lastException);
}
```

---

## 🐛 常见问题

### Q1: 编译错误 "找不到符号"

**原因**: 没有正确设置包名或类路径

**解决**:
```bash
# 确保目录结构正确
mkdir -p com/oa/visitor/callback
mv VisitorCallbackUtil.java com/oa/visitor/callback/

# 编译
javac com/oa/visitor/callback/VisitorCallbackUtil.java

# 运行
java com.oa.visitor.callback.VisitorCallbackUtil
```

### Q2: 签名验证失败

**原因**: API_SECRET 配置不正确

**解决**:
1. 联系访客系统管理员获取正确的 API_SECRET
2. 确认没有多余的空格或换行符
3. 检查编码是否为 UTF-8

### Q3: 连接超时

**原因**: 网络不通或防火墙限制

**解决**:
```bash
# 测试网络连通性
telnet visitor.timehuasun.cn 8021

# 或
curl -v https://visitor.timehuasun.cn:8021/api/visitors/callback/approval
```

### Q4: HTTPS 证书错误

**原因**: SSL 证书不受信任

**解决**: 
- 生产环境：导入正确的 CA 证书
- 测试环境：临时禁用证书验证（不推荐）

---

## 📊 响应示例

### 成功响应

```json
{
  "code": 0,
  "message": "回调处理成功"
}
```

**CallbackResult**:
```
success: true
responseCode: 200
responseBody: {"code":0,"message":"回调处理成功"}
```

### 失败响应

```json
{
  "code": 400,
  "message": "签名验证失败"
}
```

**CallbackResult**:
```
success: false
responseCode: 400
responseBody: {"code":400,"message":"签名验证失败"}
```

---

## 📞 技术支持

如有问题，请联系：
- **访客系统管理员**: [填写联系人]
- **邮箱**: [填写邮箱]
- **文档版本**: v1.0
- **最后更新**: 2026-04-07

---

## ✅ 检查清单

在使用前请确认：

- [ ] 已修改 `API_SECRET` 配置
- [ ] 已测试网络连通性
- [ ] 已编译并通过测试
- [ ] 已集成到 OA 系统审批流程
- [ ] 已添加异常处理和日志记录
- [ ] 已在测试环境验证
- [ ] 已准备回滚方案
