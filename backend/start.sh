#!/bin/bash

# 访客系统后端服务启动脚本
# 用法：./start.sh [development|production]

set -e

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 获取脚本所在目录
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# 默认环境为 development
ENV=${1:-development}

echo ""
echo "======================================"
echo "🚀 访客系统后端服务启动脚本"
echo "======================================"
echo ""

# 检查 Node.js 是否安装
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ 错误：未找到 Node.js，请先安装 Node.js${NC}"
    exit 1
fi

# 检查是否在 backend 目录
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ 错误：请在 backend 目录下运行此脚本${NC}"
    exit 1
fi

# 根据环境加载配置
load_config() {
    if [ "$ENV" = "production" ]; then
        echo -e "${YELLOW}⚠️  警告：即将启动【生产环境】服务${NC}"
        echo ""
        echo "   📍 后端地址：192.168.88.25:8021"
        echo "   🔗 OA 系统：http://10.10.10.175:9081/ekp"
        echo "   📊 数据库：MySQL (localhost:3306)"
        echo ""
        
        # 检查生产环境配置是否存在
        if [ ! -f ".env.production" ]; then
            echo -e "${RED}❌ 错误：缺少生产环境配置文件 .env.production${NC}"
            exit 1
        fi
        
        read -p "确认继续启动？(y/n): " confirm
        if [ "$confirm" != "y" ]; then
            echo -e "${YELLOW}已取消启动${NC}"
            exit 0
        fi
        
        # 使用生产配置
        cp .env.production .env
        export NODE_ENV=production
        
    elif [ "$ENV" = "development" ]; then
        echo -e "${BLUE}🛠️  启动【开发环境】服务${NC}"
        echo ""
        echo "   📍 后端地址：localhost:3000"
        echo "   🔗 OA 系统：http://192.168.0.158:8080"
        echo "   📊 数据库：MySQL (localhost:3306)"
        echo ""
        
        # 使用开发配置
        if [ -f ".env.development" ]; then
            cp .env.development .env
        else
            echo -e "${YELLOW}⚠️  警告：.env.development 不存在，使用当前 .env 配置${NC}"
        fi
        
        export NODE_ENV=development
        
    else
        echo -e "${RED}❌ 错误：未知的环境 '$ENV'${NC}"
        echo "用法：$0 [development|production]"
        exit 1
    fi
}

# 停止旧的服务
stop_old_service() {
    echo -e "${BLUE}📋 正在停止旧的服务...${NC}"
    
    # 尝试停止 3000 端口的进程
    DEV_PID=$(lsof -ti:3000 2>/dev/null || true)
    if [ -n "$DEV_PID" ]; then
        echo "   停止开发环境服务 (PID: $DEV_PID)"
        kill $DEV_PID 2>/dev/null || true
        sleep 1
    fi
    
    # 尝试停止 8021 端口的进程
    PROD_PID=$(lsof -ti:8021 2>/dev/null || true)
    if [ -n "$PROD_PID" ]; then
        echo "   停止生产环境服务 (PID: $PROD_PID)"
        kill $PROD_PID 2>/dev/null || true
        sleep 1
    fi
    
    echo -e "${GREEN}✅ 旧服务已停止${NC}"
    echo ""
}

# 安装依赖（如果需要）
check_dependencies() {
    if [ ! -d "node_modules" ]; then
        echo -e "${YELLOW}📦 首次运行，正在安装依赖...${NC}"
        npm install
        echo ""
    fi
}

# 启动服务
start_service() {
    echo -e "${GREEN}🚀 正在启动服务...${NC}"
    echo ""
    
    # 后台运行服务
    nohup npm start > logs/startup.log 2>&1 &
    PID=$!
    
    echo -e "${GREEN}✅ 服务已启动 (PID: $PID)${NC}"
    echo ""
    
    # 等待服务启动
    sleep 3
    
    # 检查服务状态
    if ps -p $PID > /dev/null; then
        echo -e "${GREEN}======================================${NC}"
        if [ "$ENV" = "production" ]; then
            echo -e "${GREEN}✅ 生产环境服务运行中${NC}"
            echo ""
            echo "   📍 访问地址：http://192.168.88.25:8021"
            echo "   📝 日志文件：logs/startup.log"
            echo ""
            echo -e "${YELLOW}⚠️  提示：按 Ctrl+C 查看日志${NC}"
        else
            echo -e "${GREEN}✅ 开发环境服务运行中${NC}"
            echo ""
            echo "   📍 访问地址：http://localhost:3000"
            echo "   📝 日志文件：logs/startup.log"
            echo ""
            echo -e "${BLUE}💡 提示：按 Ctrl+C 查看实时日志${NC}"
        fi
        echo -e "${GREEN}======================================${NC}"
        echo ""
        
        # 显示最近的日志
        echo -e "${BLUE}📋 最近日志：${NC}"
        tail -n 10 logs/startup.log
        echo ""
        
        # 保持前台运行以便查看日志
        tail -f logs/startup.log
    else
        echo -e "${RED}❌ 服务启动失败，请查看日志：${NC}"
        cat logs/startup.log
        exit 1
    fi
}

# 主流程
main() {
    load_config
    stop_old_service
    check_dependencies
    start_service
}

# 捕获退出信号
trap 'echo ""; echo -e "${YELLOW}正在停止服务...${NC}"; kill $(lsof -ti:3000) 2>/dev/null || kill $(lsof -ti:8021) 2>/dev/null || true; exit 0' INT TERM EXIT

# 执行主流程
main
