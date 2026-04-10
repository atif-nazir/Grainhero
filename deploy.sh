#!/bin/bash
# ─────────────────────────────────────────────────────────────
# GrainHero — Huawei Cloud ECS Deployment Script
# Supports: Huawei Cloud EulerOS (uses yum + docker-compose v1)
# ─────────────────────────────────────────────────────────────

set -e

echo "═══════════════════════════════════════════════════════"
echo "  🚀 GrainHero — Huawei Cloud Deployment"
echo "═══════════════════════════════════════════════════════"

# ── Step 1: Install Docker from Huawei repos ─────────────
if ! command -v docker &> /dev/null; then
    echo "📦 Installing Docker..."
    yum install -y docker-engine
    systemctl enable docker
    systemctl start docker
    echo "✅ Docker installed!"
else
    echo "✅ Docker: $(docker --version)"
fi

# ── Step 2: Install docker-compose via pip ────────────────
if ! command -v docker-compose &> /dev/null; then
    echo "📦 Installing docker-compose..."
    yum install -y python3 python3-pip
    pip3 install docker-compose
    echo "✅ docker-compose installed!"
else
    echo "✅ docker-compose: $(docker-compose version)"
fi

# ── Step 3: Install Git ──────────────────────────────────
if ! command -v git &> /dev/null; then
    echo "📦 Installing Git..."
    yum install -y git
fi

# ── Step 4: Check .env file ──────────────────────────────
if [ ! -f .env ]; then
    if [ -f .env.production ]; then
        cp .env.production .env
        echo "╔══════════════════════════════════════════════╗"
        echo "║  ⚠️  Edit .env: replace YOUR_ECS_EIP         ║"
        echo "║  Run: vi .env   then re-run: ./deploy.sh     ║"
        echo "╚══════════════════════════════════════════════╝"
        exit 1
    else
        echo "❌ No .env file found!"
        exit 1
    fi
fi

if grep -q "YOUR_ECS_EIP" .env; then
    echo "❌ .env still has placeholder! Edit it first: vi .env"
    exit 1
fi

echo ""
echo "── Building & Starting Services ─────────────────────"
docker-compose down --remove-orphans 2>/dev/null || true
docker-compose up -d --build

echo ""
echo "── Waiting for services... ──────────────────────────"
sleep 15

echo ""
docker-compose ps

SERVER_IP=$(grep "NEXT_PUBLIC_BACKEND_URL" .env | cut -d'/' -f3)
echo ""
echo "═══════════════════════════════════════════════════════"
echo "  ✅ GrainHero Deployed!"
echo "  🌐 http://${SERVER_IP}"
echo "  📶 MQTT: ${SERVER_IP}:1883"
echo "═══════════════════════════════════════════════════════"
