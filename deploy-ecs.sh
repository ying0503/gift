#!/bin/bash
set -e

ECS_IP="60.205.225.131"
SSH_USER="root"

echo "=== 部署 Gift Album 到 ECS ==="
echo ""

if ! osascript -e 'display dialog "确认部署到 ECS ('"$ECS_IP"')？" buttons {"取消", "确认部署"} default button "取消" with icon caution with title "Gift Album 部署" giving up after 120' 2>/dev/null | grep -q "button returned:确认部署"; then
  echo "已取消"
  exit 1
fi

echo ">>> 通过 ECS 从 Codeup 拉取最新代码并部署..."
ssh ${SSH_USER}@${ECS_IP} << 'CMD'
  set -e
  cd /root

  echo ">>> 备份 .env..."
  if [ -f /root/gift-album/.env ]; then
    cp /root/gift-album/.env /tmp/gift-env-backup
  fi

  echo ">>> 从 Codeup 克隆最新代码..."
  rm -rf /tmp/gift-album-code
  git clone --depth 1 https://yyklrexa_liqihui:pt-f7tldMk4vo2vtGFdm8CR4LKl_b4d58ea2-ba3d-4f3a-b9ec-648f8fed2ac3@liqihui-cn-hangzhou.devops.aliyuncs.com/codeup/gift/gift-album.git /tmp/gift-album-code
  rm -rf gift-album
  mv /tmp/gift-album-code gift-album
  cd gift-album

  echo ">>> 恢复 .env..."
  if [ -f /tmp/gift-env-backup ]; then
    cp /tmp/gift-env-backup /root/gift-album/.env
    rm /tmp/gift-env-backup
  fi

  source .env 2>/dev/null || true

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

  echo ">>> 初始化数据库..."
  mysql -u root -e "CREATE DATABASE IF NOT EXISTS ${DB_NAME:-gift_album} DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
  mysql -u root -e "CREATE USER IF NOT EXISTS '${DB_USER:-gift_album}'@'localhost' IDENTIFIED BY '${DB_PASSWORD}';"
  mysql -u root -e "GRANT ALL PRIVILEGES ON ${DB_NAME:-gift_album}.* TO '${DB_USER:-gift_album}'@'localhost';"
  mysql -u root -e "FLUSH PRIVILEGES;"

  echo ">>> 安装依赖..."
  npm install
  echo ">>> 构建前端..."
  if [ ! -L dist-current ]; then ln -s dist dist-current; fi
  npx vite build --outDir dist-new
  ln -sfn dist-new dist-current.tmp
  mv -T dist-current.tmp dist-current
  ln -sfn dist-new dist 2>/dev/null || true

  echo ">>> 启动服务..."
  npm install -g pm2
  if pm2 list 2>/dev/null | grep -q gift-album; then
    pm2 reload gift-album --update-env
  else
    pm2 start server.js --name gift-album -i 2
  fi
  pm2 save
  pm2 startup | tail -1

  echo "=== ECS 完成！http://localhost:${PORT:-3000} ==="
CMD

echo ""
echo "=== 部署完成！==="
echo "ECS 地址: http://${ECS_IP}:3000"
