#!/bin/bash

# OA 系统手机号查询接口测试脚本

echo "======================================"
echo "OA 系统手机号查询接口测试"
echo "======================================"
echo ""

# 配置
BASE_URL="http://192.168.0.158:8080"
AUTHORIZATION="Basic YXBpOkdkZnZ0RW5jQ1JVMTRYdg=="
API_ENDPOINT="${BASE_URL}/api/pro-visitor/proVisitorRestService/queryUserByPhone"

echo "接口地址：${API_ENDPOINT}"
echo "认证信息：${AUTHORIZATION}"
echo ""

# 测试用例 1：查询成功的手机号
echo "======================================"
echo "测试 1: 查询已登记的手机号 (15734268771)"
echo "======================================"

curl --location --request POST "${API_ENDPOINT}" \
  --header 'Authorization: '"${AUTHORIZATION}" \
  --header 'Content-Type: application/json' \
  --data-raw '{
    "mobile": "15734268771"
  }' | jq '.'

echo ""
echo ""

# 测试用例 2：查询不存在的手机号
echo "======================================"
echo "测试 2: 查询未登记的手机号 (13800138000)"
echo "======================================"

curl --location --request POST "${API_ENDPOINT}" \
  --header 'Authorization: '"${AUTHORIZATION}" \
  --header 'Content-Type: application/json' \
  --data-raw '{
    "mobile": "13800138000"
  }' | jq '.'

echo ""
echo ""

# 测试用例 3：手机号格式错误
echo "======================================"
echo "测试 3: 手机号格式错误 (123456)"
echo "======================================"

curl --location --request POST "${API_ENDPOINT}" \
  --header 'Authorization: '"${AUTHORIZATION}" \
  --header 'Content-Type: application/json' \
  --data-raw '{
    "mobile": "123456"
  }' | jq '.'

echo ""
echo ""

# 测试用例 4：缺少手机号参数
echo "======================================"
echo "测试 4: 缺少手机号参数"
echo "======================================"

curl --location --request POST "${API_ENDPOINT}" \
  --header 'Authorization: '"${AUTHORIZATION}" \
  --header 'Content-Type: application/json' \
  --data-raw '{}' | jq '.'

echo ""
echo ""

echo "======================================"
echo "测试完成！"
echo "======================================"
