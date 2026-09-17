@echo off
echo ===================================================
echo   INICIANDO ERP / LIS LABORATORIO CLINICO
echo ===================================================
echo.

REM 1. Verificar si Docker está en ejecución
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker no se encuentra en ejecucion. Por favor inicia Docker Desktop e intenta nuevamente.
    pause
    exit /b 1
)

echo [1/3] Levantando servicios con Docker Compose...
docker compose up -d --build

echo [2/3] Esperando inicializacion de la base de datos...
timeout /t 5 >nul

echo [3/3] Aplicando datos iniciales de prueba (Seed)...
docker compose exec -T app npm run prisma:seed

echo.
echo ===================================================
echo   SISTEMA LISTO Y OPERATIVO EN:
echo   - Dashboard & Caja:  http://localhost:3000
echo   - Portal Pacientes:  http://localhost:3000/resultados
echo   - Acceso Login:      http://localhost:3000/login
echo ===================================================
pause
