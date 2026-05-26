#!/bin/bash
set -euo pipefail
exec > /var/log/user-data.log 2>&1

echo "=== KIRO Manager user_data 시작 ==="

# 시스템 업데이트 + Docker + Git 설치
dnf update -y
dnf install -y docker git

# Docker Compose 플러그인 설치 (ARM 호환)
mkdir -p /usr/local/lib/docker/cli-plugins
COMPOSE_VERSION="v2.29.1"
ARCH=$(uname -m)
case $ARCH in
  aarch64) ARCH="aarch64" ;;
  x86_64)  ARCH="x86_64" ;;
esac
curl -fsSL "https://github.com/docker/compose/releases/download/$${COMPOSE_VERSION}/docker-compose-linux-$${ARCH}" \
  -o /usr/local/lib/docker/cli-plugins/docker-compose
chmod +x /usr/local/lib/docker/cli-plugins/docker-compose

# Docker 시작
systemctl enable docker
systemctl start docker
usermod -aG docker ec2-user

# 소스코드 클론
git clone ${github_repo} /opt/kiro-manager
cd /opt/kiro-manager

# 환경변수 파일 생성
cat > .env <<EOF
DATABASE_URL=${database_url}
JWT_SECRET=${jwt_secret}
S3_BUCKET=${s3_bucket}
AWS_REGION=${aws_region}
AWS_ACCOUNT_ID=${aws_account_id}
IDENTITY_STORE_ID=${identity_store_id}
COLLECT_INTERVAL_MINUTES=60
SLACK_WEBHOOK_URL=${slack_webhook_url}
NODE_ENV=production
EOF

# Docker 이미지 빌드 + 실행
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d

# 헬스체크 대기 (최대 150초)
echo "=== 헬스체크 대기 ==="
for i in $(seq 1 30); do
  if curl -sf http://localhost:3000/api/health > /dev/null 2>&1; then
    echo "App healthy (attempt $${i})"
    break
  fi
  echo "Waiting... ($${i}/30)"
  sleep 5
done

echo "=== KIRO Manager user_data 완료 ==="
