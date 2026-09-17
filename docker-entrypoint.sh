#!/bin/sh
set -e

echo "🚀 Iniciando ERP / LIS en contenedor Docker..."

# Aplicar migraciones o sincronización de esquema a la base de datos
echo "📦 Sincronizando esquema de base de datos..."
npx prisma db push --skip-generate || true

echo "🌱 Iniciando servidor web en http://0.0.0.0:3000..."
exec "$@"
