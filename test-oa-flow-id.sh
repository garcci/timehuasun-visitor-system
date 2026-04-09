#!/bin/bash

# OA 流程 ID 回写功能测试脚本

echo "=========================================="
echo "  OA 流程 ID 回写功能测试"
echo "=========================================="
echo ""

# 配置
API_URL="https://visitor.timehuasun.cn:8021"
TEST_APPLICATION_ID=""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 测试结果统计
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# 测试函数
run_test() {
    local test_name="$1"
    local test_command="$2"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo -e "${YELLOW}[测试 $TOTAL_TESTS]${NC} $test_name"
    
    if eval "$test_command"; then
        echo -e "${GREEN}✓ 通过${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        return 0
    else
        echo -e "${RED}✗ 失败${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        return 1
    fi
    echo ""
}

echo "步骤 1: 检查后端服务状态"
echo "-------------------------------------------"
run_test "后端服务是否运行" \
    "ssh visitor 'ps aux | grep \"node src\" | grep -v grep' > /dev/null 2>&1"

echo ""
echo "步骤 2: 提交测试申请"
echo "-------------------------------------------"

# 生成测试数据
TIMESTAMP=$(date +%s)
TEST_NAME="测试用户_${TIMESTAMP}"
TEST_PHONE="138${RANDOM:0:4}${RANDOM:0:4}"
TEST_ID_CARD="11010119900101${RANDOM:0:4}"
TEST_HOST_PHONE="13900139000"

echo "测试数据:"
echo "  姓名: $TEST_NAME"
echo "  手机号: $TEST_PHONE"
echo "  身份证: $TEST_ID_CARD"
echo "  被访人电话: $TEST_HOST_PHONE"
echo ""

# 提交申请
SUBMIT_RESPONSE=$(curl -k -s -X POST "${API_URL}/api/visitors" \
  -H "Content-Type: application/json" \
  -d "{
    \"openid\": \"test_openid_${TIMESTAMP}\",
    \"name\": \"$TEST_NAME\",
    \"phone\": \"$TEST_PHONE\",
    \"idCard\": \"$TEST_ID_CARD\",
    \"idType\": \"居民身份证\",
    \"organization\": \"测试公司\",
    \"hostName\": \"测试被访人\",
    \"hostPhone\": \"$TEST_HOST_PHONE\",
    \"visitDate\": \"$(date -v+1d +%Y-%m-%d)\",
    \"visitTime\": \"09:00\",
    \"endDate\": \"$(date -v+1d +%Y-%m-%d)\",
    \"endTime\": \"18:00\",
    \"purpose\": \"测试OA流程ID回写\",
    \"companions\": []
  }")

echo "提交响应:"
echo "$SUBMIT_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$SUBMIT_RESPONSE"
echo ""

# 提取申请ID
APPLICATION_ID=$(echo "$SUBMIT_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['id'])" 2>/dev/null)

if [ -z "$APPLICATION_ID" ]; then
    echo -e "${RED}✗ 无法获取申请ID，测试终止${NC}"
    exit 1
fi

echo -e "${GREEN}✓ 申请提交成功，ID: $APPLICATION_ID${NC}"
TEST_APPLICATION_ID=$APPLICATION_ID
echo ""

echo "步骤 3: 等待 OA 接口调用（异步）"
echo "-------------------------------------------"
echo "等待 5 秒让异步任务完成..."
sleep 5
echo ""

echo "步骤 4: 查询申请详情"
echo "-------------------------------------------"

DETAIL_RESPONSE=$(curl -k -s -X GET "${API_URL}/api/visitors/${APPLICATION_ID}")

echo "详情响应:"
echo "$DETAIL_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$DETAIL_RESPONSE"
echo ""

# 提取 oa_flow_id
OA_FLOW_ID=$(echo "$DETAIL_RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('data', {}).get('oa_flow_id', ''))" 2>/dev/null)

echo "步骤 5: 验证 OA 流程 ID"
echo "-------------------------------------------"

if [ -n "$OA_FLOW_ID" ] && [ "$OA_FLOW_ID" != "null" ] && [ "$OA_FLOW_ID" != "" ]; then
    echo -e "${GREEN}✓ OA 流程 ID 已成功回写${NC}"
    echo "  流程 ID: $OA_FLOW_ID"
    OA_TEST_PASSED=true
else
    echo -e "${YELLOW}⚠ OA 流程 ID 为空${NC}"
    echo "  可能原因："
    echo "  1. OA 接口尚未返回（异步调用需要时间）"
    echo "  2. OA 接口调用失败"
    echo "  3. OA 返回的数据结构不包含 flowId"
    OA_TEST_PASSED=false
fi
echo ""

echo "步骤 6: 查看后端日志"
echo "-------------------------------------------"
echo "最近的 OA 相关日志:"
ssh visitor "tail -50 /home/node/visitor/auto-deploy/current/backend/backend.log | grep -E 'OA|流程|flowId' | tail -10" 2>/dev/null || echo "无法获取日志"
echo ""

echo "步骤 7: 管理后台验证"
echo "-------------------------------------------"
echo "请访问管理后台查看详情："
echo "  URL: ${API_URL}/visitors/${APPLICATION_ID}"
echo "  用户名: admin"
echo "  密码: admin123"
echo ""
echo "在详情页应该能看到 'OA流程ID' 字段"
echo ""

echo "步骤 8: 清理测试数据（可选）"
echo "-------------------------------------------"
read -p "是否删除测试申请？(y/n): " DELETE_CONFIRM
if [ "$DELETE_CONFIRM" = "y" ] || [ "$DELETE_CONFIRM" = "Y" ]; then
    curl -k -s -X DELETE "${API_URL}/api/admin/visitors/${APPLICATION_ID}" \
      -H "Authorization: Bearer YOUR_ADMIN_TOKEN" > /dev/null 2>&1
    echo -e "${GREEN}✓ 测试数据已删除${NC}"
else
    echo "测试数据保留，可手动删除"
fi
echo ""

echo "=========================================="
echo "  测试总结"
echo "=========================================="
echo ""
echo "申请 ID: $APPLICATION_ID"
echo "OA 流程 ID: ${OA_FLOW_ID:-未生成}"
echo ""

if [ "$OA_TEST_PASSED" = true ]; then
    echo -e "${GREEN}✓ 测试通过：OA 流程 ID 回写功能正常${NC}"
    exit 0
else
    echo -e "${YELLOW}⚠ 测试警告：OA 流程 ID 未生成${NC}"
    echo ""
    echo "建议检查："
    echo "1. OA 系统是否可达"
    echo "2. OA 接口配置是否正确"
    echo "3. 后端日志中的错误信息"
    echo ""
    echo "查看详细日志："
    echo "  ssh visitor 'tail -100 /home/node/visitor/auto-deploy/current/backend/backend.log | grep OA'"
    exit 1
fi
