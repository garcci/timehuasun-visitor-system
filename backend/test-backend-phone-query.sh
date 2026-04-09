#!/bin/bash

# 测试后端手机号查询接口（包含姓名）

echo "======================================"
echo "手机号查询接口测试（含姓名自动填充）"
echo "======================================"
echo ""

# 配置
BACKEND_URL="http://localhost:3000"
API_ENDPOINT="${BACKEND_URL}/api/visitors/query-by-phone"

echo "后端地址：${API_ENDPOINT}"
echo ""

# 测试用例 1：查询已登记的手机号（有姓名）
echo "======================================"
echo "测试 1: 查询已登记的手机号 (15734268771)"
echo "预期：返回姓名 '盖丽萍' 和 loginName"
echo "======================================"

curl --location --request POST "${API_ENDPOINT}" \
  --header 'Content-Type: application/json' \
  --data-raw '{
    "phone": "15734268771",
    "type": "host"
  }' | jq '.'

echo ""
echo ""

# 测试用例 2：查询不存在的手机号
echo "======================================"
echo "测试 2: 查询未登记的手机号 (13800138000)"
echo "预期：返回错误提示"
echo "======================================"

curl --location --request POST "${API_ENDPOINT}" \
  --header 'Content-Type: application/json' \
  --data-raw '{
    "phone": "13800138000",
    "type": "host"
  }' | jq '.'

echo ""
echo ""

# 测试用例 3：手机号格式错误
echo "======================================"
echo "测试 3: 手机号格式错误 (123456)"
echo "预期：前端应该拦截，不会发送到后端"
echo "======================================"

curl --location --request POST "${API_ENDPOINT}" \
  --header 'Content-Type: application/json' \
  --data-raw '{
    "phone": "123456",
    "type": "host"
  }' | jq '.'

echo ""
echo ""

# 测试用例 4：缺少手机号参数
echo "======================================"
echo "测试 4: 缺少手机号参数"
echo "预期：返回 400 错误"
echo "======================================"

curl --location --request POST "${API_ENDPOINT}" \
  --header 'Content-Type: application/json' \
  --data-raw '{
    "type": "host"
  }' | jq '.'

echo ""
echo ""

echo "======================================"
echo "测试完成！"
echo "======================================"
echo ""
echo "📊 测试结果分析："
echo ""
echo "✅ 如果测试 1 返回："
echo "   - code: 0"
echo "   - data.name: '盖丽萍'"
echo "   - data.loginName: '15734268771'"
echo "   - data.found: true"
echo "   说明接口正常！"
echo ""
echo "✅ 如果测试 2 返回："
echo "   - code: 1001"
echo "   - message: '该手机号未在 OA 系统中登记'"
echo "   - data.found: false"
echo "   说明失败处理正常！"
echo ""
echo "⚠️  注意事项："
echo "   1. 确保后端服务已启动 (npm start)"
echo "   2. 确保 .env 文件配置正确"
echo "   3. 检查后端日志查看详细调用过程"
echo ""
