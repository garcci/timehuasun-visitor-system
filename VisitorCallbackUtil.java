package com.oa.visitor.callback;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Map;
import java.util.TreeMap;

/**
 * 访客系统 OA 审批回调工具类
 * 
 * 使用方法：
 * 1. 配置 API_SECRET（从访客系统管理员获取）
 * 2. 调用 sendApprovalCallback() 方法发送审批结果
 * 
 * @author Visitor System
 * @version 1.0
 * @date 2026-04-07
 */
public class VisitorCallbackUtil {
    
    // ==================== 配置项 ====================
    
    /**
     * 访客系统回调接口地址
     */
    private static final String CALLBACK_URL = "https://visitor.timehuasun.cn:8021/api/visitors/callback/approval";
    
    /**
     * API 密钥（从访客系统管理员获取）
     * 生产环境建议从配置文件或环境变量读取
     */
    private static final String API_SECRET = "your_api_secret_key_here";
    
    /**
     * 连接超时时间（毫秒）
     */
    private static final int CONNECT_TIMEOUT = 5000;
    
    /**
     * 读取超时时间（毫秒）
     */
    private static final int READ_TIMEOUT = 10000;
    
    // ==================== 主方法 ====================
    
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
     * @return 回调结果
     * @throws Exception 异常信息
     */
    public static CallbackResult sendApprovalCallback(
            String applicationId,
            String oaFlowId,
            String status,
            String approvalTime,
            String rejectReason,
            String approverName,
            String approverPhone) throws Exception {
        
        // 1. 参数验证
        if (oaFlowId == null || oaFlowId.trim().isEmpty()) {
            throw new IllegalArgumentException("OA流程ID不能为空");
        }
        if (status == null || (!"approved".equals(status) && !"rejected".equals(status))) {
            throw new IllegalArgumentException("审批状态必须是 approved 或 rejected");
        }
        if (approvalTime == null || approvalTime.trim().isEmpty()) {
            throw new IllegalArgumentException("审批时间不能为空");
        }
        if ("rejected".equals(status) && (rejectReason == null || rejectReason.trim().isEmpty())) {
            throw new IllegalArgumentException("拒绝时必须填写拒绝原因");
        }
        
        // 2. 构建请求数据
        TreeMap<String, Object> data = new TreeMap<>();
        
        // 只添加非空值
        if (applicationId != null && !applicationId.trim().isEmpty()) {
            data.put("applicationId", applicationId);
        }
        data.put("oaFlowId", oaFlowId);
        data.put("status", status);
        data.put("approvalTime", approvalTime);
        
        if (rejectReason != null && !rejectReason.trim().isEmpty()) {
            data.put("rejectReason", rejectReason);
        }
        if (approverName != null && !approverName.trim().isEmpty()) {
            data.put("approverName", approverName);
        }
        if (approverPhone != null && !approverPhone.trim().isEmpty()) {
            data.put("approverPhone", approverPhone);
        }
        
        // 3. 生成签名
        String signature = generateSign(data);
        data.put("sign", signature);
        
        // 4. 转换为 JSON
        String jsonBody = toJson(data);
        
        // 5. 发送 HTTP 请求
        return sendHttpPost(CALLBACK_URL, jsonBody, signature);
    }
    
    // ==================== 签名相关方法 ====================
    
    /**
     * 生成签名
     * 
     * 算法步骤：
     * 1. 将所有参数按 key 的字典序排序
     * 2. 拼接成 key1=value1&key2=value2... 的格式
     * 3. 在末尾追加 API_SECRET
     * 4. 对最终字符串进行 MD5 加密
     * 5. 转为大写
     * 
     * @param data 需要签名的数据（TreeMap 已排序）
     * @return 签名值（大写）
     */
    public static String generateSign(TreeMap<String, Object> data) {
        try {
            // 1. 拼接字符串（TreeMap 已经按 key 排序）
            StringBuilder sb = new StringBuilder();
            for (Map.Entry<String, Object> entry : data.entrySet()) {
                if (sb.length() > 0) {
                    sb.append("&");
                }
                sb.append(entry.getKey()).append("=").append(entry.getValue());
            }
            
            // 2. 追加密钥
            sb.append(API_SECRET);
            
            // 3. MD5 加密
            MessageDigest md = MessageDigest.getInstance("MD5");
            byte[] digest = md.digest(sb.toString().getBytes(StandardCharsets.UTF_8));
            
            // 4. 转十六进制字符串（大写）
            StringBuilder hexString = new StringBuilder();
            for (byte b : digest) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) {
                    hexString.append('0');
                }
                hexString.append(hex);
            }
            
            return hexString.toString().toUpperCase();
        } catch (Exception e) {
            throw new RuntimeException("签名生成失败", e);
        }
    }
    
    // ==================== HTTP 请求方法 ====================
    
    /**
     * 发送 HTTP POST 请求
     * 
     * @param urlStr 请求URL
     * @param jsonBody JSON 请求体
     * @param signature 签名值
     * @return 回调结果
     * @throws Exception 异常信息
     */
    private static CallbackResult sendHttpPost(String urlStr, String jsonBody, String signature) throws Exception {
        HttpURLConnection connection = null;
        BufferedReader reader = null;
        
        try {
            // 1. 创建连接
            URL url = new URL(urlStr);
            connection = (HttpURLConnection) url.openConnection();
            
            // 2. 设置请求方法
            connection.setRequestMethod("POST");
            
            // 3. 设置请求头
            connection.setRequestProperty("Content-Type", "application/json; charset=UTF-8");
            connection.setRequestProperty("X-OA-Signature", signature);
            connection.setRequestProperty("Accept", "application/json");
            
            // 4. 设置超时
            connection.setConnectTimeout(CONNECT_TIMEOUT);
            connection.setReadTimeout(READ_TIMEOUT);
            
            // 5. 允许输出
            connection.setDoOutput(true);
            
            // 6. 发送请求体
            try (OutputStream os = connection.getOutputStream()) {
                os.write(jsonBody.getBytes(StandardCharsets.UTF_8));
                os.flush();
            }
            
            // 7. 获取响应码
            int responseCode = connection.getResponseCode();
            
            // 8. 读取响应
            reader = new BufferedReader(new InputStreamReader(
                    responseCode >= 200 && responseCode < 300 
                            ? connection.getInputStream() 
                            : connection.getErrorStream(),
                    StandardCharsets.UTF_8
            ));
            
            StringBuilder response = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) {
                response.append(line);
            }
            
            // 9. 解析结果
            CallbackResult result = new CallbackResult();
            result.setResponseCode(responseCode);
            result.setResponseBody(response.toString());
            result.setSuccess(responseCode >= 200 && responseCode < 300);
            
            return result;
            
        } finally {
            // 10. 关闭资源
            if (reader != null) {
                try {
                    reader.close();
                } catch (Exception e) {
                    // 忽略
                }
            }
            if (connection != null) {
                connection.disconnect();
            }
        }
    }
    
    // ==================== JSON 转换方法 ====================
    
    /**
     * 将 TreeMap 转换为 JSON 字符串
     * 
     * @param data 数据
     * @return JSON 字符串
     */
    private static String toJson(TreeMap<String, Object> data) {
        StringBuilder json = new StringBuilder("{");
        boolean first = true;
        
        for (Map.Entry<String, Object> entry : data.entrySet()) {
            if (!first) {
                json.append(",");
            }
            
            json.append("\"").append(escapeJson(entry.getKey())).append("\":");
            
            Object value = entry.getValue();
            if (value instanceof String) {
                json.append("\"").append(escapeJson((String) value)).append("\"");
            } else {
                json.append(value);
            }
            
            first = false;
        }
        
        json.append("}");
        return json.toString();
    }
    
    /**
     * 转义 JSON 特殊字符
     * 
     * @param str 原始字符串
     * @return 转义后的字符串
     */
    private static String escapeJson(String str) {
        if (str == null) {
            return "";
        }
        return str.replace("\\", "\\\\")
                  .replace("\"", "\\\"")
                  .replace("\n", "\\n")
                  .replace("\r", "\\r")
                  .replace("\t", "\\t");
    }
    
    // ==================== 内部类 ====================
    
    /**
     * 回调结果
     */
    public static class CallbackResult {
        private boolean success;
        private int responseCode;
        private String responseBody;
        
        public boolean isSuccess() {
            return success;
        }
        
        public void setSuccess(boolean success) {
            this.success = success;
        }
        
        public int getResponseCode() {
            return responseCode;
        }
        
        public void setResponseCode(int responseCode) {
            this.responseCode = responseCode;
        }
        
        public String getResponseBody() {
            return responseBody;
        }
        
        public void setResponseBody(String responseBody) {
            this.responseBody = responseBody;
        }
        
        @Override
        public String toString() {
            return "CallbackResult{" +
                    "success=" + success +
                    ", responseCode=" + responseCode +
                    ", responseBody='" + responseBody + '\'' +
                    '}';
        }
    }
    
    // ==================== 测试方法 ====================
    
    /**
     * 测试方法 - 审批通过
     */
    public static void testApprove() {
        try {
            System.out.println("========== 测试审批通过 ==========");
            
            CallbackResult result = sendApprovalCallback(
                    "8c0f0d47-b1ea-4cc6-bf9b-93eb00312662",  // applicationId（可选）
                    "KM_FLOW_20260407_001",                    // oaFlowId（必填）
                    "approved",                                 // status
                    "2026-04-07 14:30:00",                     // approvalTime
                    null,                                       // rejectReason（通过时不需要）
                    "张三",                                     // approverName
                    "13800138000"                              // approverPhone
            );
            
            System.out.println("成功: " + result.isSuccess());
            System.out.println("响应码: " + result.getResponseCode());
            System.out.println("响应体: " + result.getResponseBody());
            
        } catch (Exception e) {
            System.err.println("测试失败: " + e.getMessage());
            e.printStackTrace();
        }
    }
    
    /**
     * 测试方法 - 审批拒绝
     */
    public static void testReject() {
        try {
            System.out.println("========== 测试审批拒绝 ==========");
            
            CallbackResult result = sendApprovalCallback(
                    null,                                        // applicationId（可选，不传）
                    "KM_FLOW_20260407_002",                    // oaFlowId（必填）
                    "rejected",                                  // status
                    "2026-04-07 15:00:00",                     // approvalTime
                    "来访时间冲突，请重新预约",                   // rejectReason（拒绝时必填）
                    "李四",                                     // approverName
                    "13900139000"                              // approverPhone
            );
            
            System.out.println("成功: " + result.isSuccess());
            System.out.println("响应码: " + result.getResponseCode());
            System.out.println("响应体: " + result.getResponseBody());
            
        } catch (Exception e) {
            System.err.println("测试失败: " + e.getMessage());
            e.printStackTrace();
        }
    }
    
    /**
     * 测试方法 - 只传 oaFlowId
     */
    public static void testWithOnlyOaFlowId() {
        try {
            System.out.println("========== 测试只传 oaFlowId ==========");
            
            CallbackResult result = sendApprovalCallback(
                    null,                                        // applicationId（不传）
                    "KM_FLOW_20260407_003",                    // oaFlowId（必填）
                    "approved",                                 // status
                    "2026-04-07 16:00:00",                     // approvalTime
                    null,                                       // rejectReason
                    "王五",                                     // approverName
                    "13700137000"                              // approverPhone
            );
            
            System.out.println("成功: " + result.isSuccess());
            System.out.println("响应码: " + result.getResponseCode());
            System.out.println("响应体: " + result.getResponseBody());
            
        } catch (Exception e) {
            System.err.println("测试失败: " + e.getMessage());
            e.printStackTrace();
        }
    }
    
    /**
     * 主方法 - 运行测试
     */
    public static void main(String[] args) {
        System.out.println("访客系统 OA 审批回调工具类 - 测试程序");
        System.out.println("=====================================\n");
        
        // 注意：请先修改 API_SECRET 配置后再运行测试
        
        testApprove();
        System.out.println();
        
        testReject();
        System.out.println();
        
        testWithOnlyOaFlowId();
    }
}
