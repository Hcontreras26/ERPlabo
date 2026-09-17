#!/bin/bash
set -e

echo "==================================================="
echo "  INICIANDO ERP / LIS LABORATORIO CLINICO"
echo "==================================================="
echo ""

# 1. Verificar Docker
if ! docker info > /dev/null 2>&1; then
    echo "❌ Error: Docker no se está ejecutando. Inicia Docker e intenta de nuevo."
    exit 1
fi

echo "📦 [1/3] Construyendo y levantando contenedores Docker..."
docker compose up -d --build

echo "⏳ [2/3] Esperando inicialización de la base de datos..."
sleep 5

echo "🌱 [3/3] Aplicando datos iniciales (Seed)..."
docker compose exec -T app npm run prisma:seed || true

echo ""
echo "==================================================="
echo "  ✅ SISTEMA LISTO Y OPERATIVO EN:"
echo "  - Dashboard & Caja:  http://localhost:3000"
echo "  - Portal Pacientes:  http://localhost:3000/resultados"
echo "  - Acceso Login:      http://localhost:3000/login"
echo "==================================================="
