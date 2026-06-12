#!/bin/bash
set -e

echo "=== 一键部署 Gift Album 到 ECS ==="
source .env

# Install Node.js if needed
if ! command -v node &> /dev/null || [ "$(node -v | cut -d'.' -f1 | tr -d 'v')" -lt 22 ]; then
  echo ">>> 安装 Node.js v22..."
  if [ -f /etc/redhat-release ]; then
    curl -fsSL https://rpm.nodesource.com/setup_22.x | bash -
    yum install -y nodejs
  else
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
    apt-get install -y nodejs
  fi
fi

# Install MySQL if needed
if ! command -v mysql &> /dev/null; then
  echo ">>> 安装 MySQL..."
  if [ -f /etc/redhat-release ]; then
    yum install -y mysql-server
    systemctl start mysqld
    systemctl enable mysqld
  else
    apt-get install -y mysql-server
    systemctl start mysql
    systemctl enable mysql
  fi
fi

# Init database
echo ">>> 初始化数据库..."
mysql -u root -e "CREATE DATABASE IF NOT EXISTS ${DB_NAME:-gift_album} DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -u root -e "CREATE USER IF NOT EXISTS '${DB_USER:-gift_album}'@'localhost' IDENTIFIED BY '${DB_PASSWORD}';"
mysql -u root -e "GRANT ALL PRIVILEGES ON ${DB_NAME:-gift_album}.* TO '${DB_USER:-gift_album}'@'localhost';"
mysql -u root -e "FLUSH PRIVILEGES;"

# Install deps & build
echo ">>> 安装依赖..."
npm install
echo ">>> 构建前端..."
npm run build

# Install PM2 & start
echo ">>> 启动服务..."
npm install -g pm2
pm2 delete gift-album 2>/dev/null || true
pm2 start server.js --name gift-album
pm2 save
pm2 startup | tail -1

echo "=== 完成！http://localhost:${PORT:-3000} ==="
