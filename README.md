# ERP / LIS Laboratorio Clínico y Facturación Multimoneda (Venezuela) 🧪🇻🇪

Sistema integral de gestión para Laboratorios Clínicos y Facturación Multimoneda adaptado al mercado venezolano con arquitectura **Multi-Tenant (Shared Database, Shared Schema)** y soporte **Multi-Sucursal (Multi-Branch)**.

---

## 🚀 Características Principales

1. **Arquitectura Multi-Tenant & Multi-Sucursal:**
   - Aislamiento completo por empresa (`Tenant`) y sedes físicas (`Branch`).
   - Personalización 1:1 de membrete fiscal, RIF, teléfono, logo y tasa BCV diaria por laboratorio.
   - Restricciones de unicidad compuestas por Tenant en pacientes, exámenes y correlativos (`ORD-YYYY-XXXX`).

2. **Manejo Multimoneda Nativo (USD / VES):**
   - Pagos divididos y combinados en tiempo real (Efectivo USD, Efectivo Bs, Pago Móvil, Punto de Venta, Zelle, Binance USDT).
   - Conversión precisa con `decimal.js` según tasa oficial BCV del día.

3. **Motor LIS (Sistema de Información de Laboratorio):**
   - Validación biológica de analitos con rangos de referencia dinámicos por sexo (Hombre / Mujer) y edad pediátrica (<12 años).
   - Alerta visual automática de resultados fuera de rango (`*` / resalto).
   - Firma digital y validación por Bioanalista certificado.

4. **Entrega Rápida y Portal del Paciente:**
   - Generación de informe clínico en formato **PDF Carta (Letter)** listo para imprimir o descargar (`@react-pdf/renderer`).
   - Enlace directo a **WhatsApp (`wa.me`)** con mensaje pre-redactado y número internacional `+58`.
   - Portal público de consulta y descarga de resultados para pacientes (`/resultados`).

5. **Arqueo y Cierre de Caja:**
   - Reporte diario de ingresos consolidados en USD y VES por método de pago.
   - Vista optimizada para impresión de cuadre de caja diario.

6. **Seguridad y Control de Acceso (RBAC):**
   - Roles: `ADMINISTRADOR`, `BIOANALISTA`, `RECEPCIONISTA`.
   - Autenticación con JWT en cookies HttpOnly y Middleware de protección.

---

## 🛠️ Stack Tecnológico

* **Framework:** Next.js 14+ (App Router, Server Actions)
* **Lenguaje:** TypeScript
* **ORM:** Prisma ORM (SQLite en dev / PostgreSQL en producción)
* **Estilos:** Tailwind CSS & Lucide Icons
* **Precisión Financiera:** Decimal.js & Zod
* **PDFs:** `@react-pdf/renderer`
* **Contenedores:** Docker & Docker Compose

---

## 📦 Instalación y Configuración Local

### 1. Clonar el repositorio
```bash
git clone https://github.com/Hcontreras26/ERPlabo.git
cd ERPlabo
```

### 2. Instalar dependencias
```bash
npm install
```

### 3. Configurar variables de entorno
Crea tu archivo `.env` basándote en `.env.example`:
```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="erplis_venezuela_jwt_secret_key_2026_secure_random"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 4. Sincronizar Base de Datos y Cargar Seed
```bash
npx prisma db push
npx prisma db seed
```

### 5. Iniciar Servidor de Desarrollo
```bash
npm run dev
```
Accede a [http://localhost:3000](http://localhost:3000).

---

## 🔑 Credenciales de Prueba (Seed Demo)

| Rol | Correo | Contraseña |
| :--- | :--- | :--- |
| **Director / Admin** | `admin@labclinic.com` | `admin123` |
| **Bioanalista** | `bio@labclinic.com` | `bio123` |
| **Recepción & Caja** | `recepcion@labclinic.com` | `recepcion123` |

---

## 🐳 Despliegue con Docker

```bash
# Iniciar con Docker Compose (Next.js + PostgreSQL)
docker compose up -d --build
```

O en Windows:
```cmd
start.bat
```
En Linux / macOS:
```bash
chmod +x start.sh
./start.sh
```

---

## 📄 Licencia

Este proyecto está bajo la licencia MIT.
