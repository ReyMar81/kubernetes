# agenda-crud

Proyecto full-stack educativo que demuestra **orquestación de contenedores** con Docker Compose (desarrollo) y **Kubernetes en producción** (AWS EC2). 

Implementa un CRUD completo de gestión de amigos con React + Vite, Node.js + Express y PostgreSQL, desplegado en contenedores Docker y orquestado con Kubernetes para demostrar escalabilidad, alta disponibilidad y auto-recuperación.

## 🎯 Características

- **Frontend**: React 18 + Vite (TypeScript) con SPA servido por Nginx
- **Backend**: Node.js + Express (TypeScript) con API REST y validación Joi
- **Base de datos**: PostgreSQL 15 con migraciones SQL
- **Contenedores**: Docker multi-stage builds
- **Desarrollo**: Docker Compose con hot-reload
- **Producción**: Kubernetes (K3s) en AWS EC2 t2.micro (free tier)
- **HTTPS**: Nginx reverse proxy + acme.sh (DuckDNS)
- **CRUD completo**: Gestión de amigos (id, name, email, phone, notes, timestamps)

## 📋 Objetivos del Proyecto

Este proyecto fue creado para:

1. ✅ **Aprender Docker**: Contenedores, multi-stage builds, redes, volúmenes
2. ✅ **Dominar orquestación**: Docker Compose para desarrollo local
3. ✅ **Implementar Kubernetes**: Despliegue escalable en producción real (AWS EC2)
4. ✅ **Demostrar conceptos clave**:
   - Escalabilidad horizontal (múltiples réplicas)
   - Auto-recuperación (self-healing)
   - Load balancing automático
   - Rolling updates sin downtime
   - Persistent storage para bases de datos
   - Health checks (liveness/readiness probes)
5. ✅ **Despliegue en la nube**: AWS EC2 con HTTPS y dominio público

## 📋 Dos Formas de Despliegue

### 1️⃣ Docker Compose (Desarrollo Local)

### 2️⃣ Kubernetes (Producción en AWS EC2)

---

## 🐳 Opción 1: Docker Compose (Local)

Ideal para desarrollo local y pruebas rápidas.

### Requisitos

- Docker Desktop instalado
- Git

### Pasos

1. Clonar el repositorio:

```bash
git clone <tu-repo>
cd agenda-crud
```

2. Copiar archivos de configuración:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

3. Levantar todos los servicios:

```bash
docker compose up --build
```

4. Acceder a la aplicación:

- **Frontend**: http://localhost:8080
- **Backend API**: http://localhost:3000/api/friends
- **Health Check**: http://localhost:3000/health

### Detener servicios

```bash
docker compose down
```

---

## ☸️ Opción 2: Kubernetes (Producción en AWS EC2)

Despliegue escalable y resiliente en Kubernetes usando K3s en una instancia EC2 de AWS (compatible con free tier t2.micro).

### ¿Qué es Kubernetes y por qué usarlo?

**Kubernetes (K8s)** es un orquestador de contenedores que automatiza el despliegue, escalado y gestión de aplicaciones en producción. Este proyecto usa **K3s**, una versión ligera de Kubernetes optimizada para edge computing y servidores pequeños.

### Ventajas sobre Docker Compose

| Característica | Docker Compose | Kubernetes (K3s) |
|----------------|----------------|------------------|
| **Escalabilidad** | ❌ Manual (1 contenedor por servicio) | ✅ Automática (N réplicas configurables) |
| **Auto-recuperación** | ❌ Si un contenedor muere, queda caído | ✅ Recrea pods automáticamente |
| **Load Balancing** | ❌ Básico entre contenedores | ✅ Distribuye tráfico entre réplicas |
| **Rolling Updates** | ❌ Requiere downtime | ✅ Sin downtime (actualización progresiva) |
| **Multi-servidor** | ❌ Un solo host | ✅ Cluster de múltiples nodos |
| **Health Checks** | ⚠️ Básico | ✅ Liveness y readiness probes |
| **Uso recomendado** | Desarrollo local | Producción |

### Arquitectura implementada

```
AWS EC2 t2.micro (K3s Cluster)
│
├── Namespace: agenda-crud
│   │
│   ├── Frontend Deployment (2 réplicas)
│   │   ├── Pod: frontend-abc123
│   │   └── Pod: frontend-xyz789
│   │   └── Service NodePort 30080 (acceso público)
│   │
│   ├── Backend Deployment (2 réplicas)
│   │   ├── Pod: backend-def456
│   │   └── Pod: backend-ghi012
│   │   └── Service ClusterIP (interno)
│   │
│   └── PostgreSQL StatefulSet (1 réplica)
│       └── Pod: postgres-0
│       └── PersistentVolumeClaim (5GB)
│
└── Nginx Reverse Proxy (host EC2)
    └── HTTPS (acme.sh + DuckDNS)
    └── Proxy → :30080 (Kubernetes)
```

### Guía completa de despliegue

Consulta la **[Guía detallada de Kubernetes](k8s/README.md)** que incluye:

1. ✅ Preparación de EC2 (instalación de Docker, Git, K3s)
2. ✅ Construcción de imágenes Docker localmente
3. ✅ Despliegue paso a paso en Kubernetes
4. ✅ Comandos para demostrar escalabilidad
5. ✅ Pruebas de auto-recuperación
6. ✅ Troubleshooting común

**Resumen rápido**:

```bash
# En EC2:
cd kubernetes/agenda-crud

# Construir imágenes:
docker build -t agenda-backend:latest -f docker/backend.Dockerfile ./backend
docker build -t agenda-frontend:latest -f docker/frontend.Dockerfile ./frontend

# Desplegar:
export KUBECONFIG=/etc/rancher/k3s/k3s.yaml
sudo -E kubectl apply -f k8s/namespace.yaml
sudo -E kubectl apply -f k8s/configmaps.yaml
sudo -E kubectl apply -f k8s/postgres-pvc.yaml
sudo -E kubectl apply -f k8s/postgres-deployment.yaml
sudo -E kubectl wait --for=condition=ready pod -l app=postgres -n agenda-crud --timeout=120s
sudo -E bash k8s/init-db.sh
sudo -E kubectl apply -f k8s/backend-deployment.yaml
sudo -E kubectl apply -f k8s/frontend-deployment.yaml

# Verificar:
sudo -E kubectl get pods -n agenda-crud
```

**URL de acceso**: 
- Sin HTTPS: `http://<EC2_PUBLIC_IP>:30080`
- Con HTTPS: `https://<tu-dominio>.duckdns.org`

---

## 📊 Comparación: Docker Compose vs Kubernetes

| Característica | Docker Compose | Kubernetes (K3s) |
|----------------|----------------|------------------|
| **Uso recomendado** | Desarrollo local | Producción |
| **Configuración** | 1 archivo YAML | 6 archivos YAML (manifiestos) |
| **Escalabilidad** | ❌ Manual, 1 contenedor/servicio | ✅ `replicas: N` automático |
| **Alta disponibilidad** | ❌ No, single point of failure | ✅ Múltiples réplicas + load balancer |
| **Auto-recuperación** | ❌ Si muere, queda caído | ✅ Self-healing automático |
| **Load balancing** | ⚠️ Básico (round-robin DNS) | ✅ Service discovery + balanceo avanzado |
| **Rolling updates** | ❌ Requiere `docker-compose down/up` | ✅ `rollout restart` sin downtime |
| **Health checks** | ⚠️ `healthcheck` básico | ✅ Liveness + readiness probes |
| **Storage persistente** | ✅ Volumes locales | ✅ PersistentVolumeClaims (PVC) |
| **Multi-servidor** | ❌ Solo local/single-host | ✅ Cluster de múltiples nodos |
| **Complejidad** | 🟢 Baja | 🟡 Media |
| **Curva de aprendizaje** | 🟢 Fácil | 🟡 Moderada |

**¿Cuándo usar cada uno?**

- **Docker Compose**: Desarrollo local, pruebas rápidas, demos simples
- **Kubernetes**: Producción, aplicaciones críticas, escalabilidad requerida

---

## 🗂️ Estructura del Proyecto

```
agenda-crud/
├── backend/                 # API REST en Node.js + Express
│   ├── src/
│   │   ├── index.ts
│   │   ├── app.ts
│   │   ├── db.ts
│   │   ├── routes/
│   │   ├── controllers/
│   │   ├── validators/
│   │   └── models/
│   ├── migrations/
│   │   └── 001_create_friends.sql
│   ├── package.json
│   └── tsconfig.json
├── frontend/                # SPA en React + Vite
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── api.ts
│   │   ├── types.ts
│   │   ├── components/
│   │   └── pages/
│   ├── package.json
│   ├── vite.config.ts
│   └── nginx.conf
├── docker/                  # Dockerfiles
│   ├── backend.Dockerfile
│   └── frontend.Dockerfile
├── k8s/                     # Manifiestos Kubernetes
│   ├── namespace.yaml
│   ├── configmaps.yaml
│   ├── postgres-deployment.yaml
│   ├── backend-deployment.yaml
│   ├── frontend-deployment.yaml
│   ├── deploy.sh
│   ├── cleanup.sh
│   ├── build-and-push.sh
│   └── README.md           # Guía detallada de K8s
├── docker-compose.yml       # Orquestación local
└── README.md               # Este archivo
```

---

## 🚀 API Endpoints

### Amigos (Friends)

- `GET /api/friends` - Listar todos los amigos
- `GET /api/friends/:id` - Obtener un amigo por ID
- `POST /api/friends` - Crear nuevo amigo
- `PUT /api/friends/:id` - Actualizar amigo existente
- `DELETE /api/friends/:id` - Eliminar amigo

### Health Check

- `GET /health` - Estado del servidor backend

---

## 🛠️ Comandos Útiles

### Docker Compose

```bash
# Iniciar servicios
docker compose up -d

# Ver logs
docker compose logs -f backend

# Reiniciar un servicio
docker compose restart backend

# Detener y eliminar todo
docker compose down -v
```

### Kubernetes

```bash
# Ver estado de pods
kubectl get pods -n agenda-crud

# Escalar backend
kubectl scale deployment backend --replicas=5 -n agenda-crud

# Ver logs
kubectl logs -f -l app=backend -n agenda-crud

# Acceder a un pod
kubectl exec -it <pod-name> -n agenda-crud -- /bin/sh

# Eliminar todo
cd k8s && ./cleanup.sh
```

---

## 🎓 Conceptos Demostrados

### Docker y Contenedores

- ✅ Multi-stage builds (optimización de imágenes)
- ✅ Redes privadas entre contenedores
- ✅ Volúmenes persistentes para bases de datos
- ✅ Variables de entorno y configuración
- ✅ Health checks y dependency management

### Kubernetes (K3s)

**Recursos básicos**:
- ✅ **Namespaces**: Aislamiento lógico de recursos
- ✅ **Deployments**: Gestión declarativa de aplicaciones stateless
- ✅ **StatefulSets**: Para bases de datos con identidad de red estable
- ✅ **Services**: ClusterIP (interno), NodePort (externo)
- ✅ **ConfigMaps y Secrets**: Gestión de configuración y credenciales
- ✅ **PersistentVolumeClaims**: Almacenamiento persistente

**Características avanzadas**:
- ✅ **Escalabilidad horizontal**: `kubectl scale deployment backend --replicas=5`
- ✅ **Self-healing**: Recrea pods automáticamente si fallan
- ✅ **Load balancing**: Distribuye tráfico entre réplicas con Services
- ✅ **Health probes**: Liveness (¿está vivo?) y Readiness (¿está listo?)
- ✅ **Rolling updates**: Actualiza sin downtime con estrategia RollingUpdate
- ✅ **Resource limits**: Controla CPU y memoria por pod

### Infraestructura

- ✅ **AWS EC2**: Despliegue en cloud con free tier (t2.micro)
- ✅ **Nginx Reverse Proxy**: HTTPS con acme.sh + DuckDNS
- ✅ **Security Groups**: Gestión de firewall en AWS
- ✅ **DNS dinámico**: DuckDNS para IP pública dinámica

---

## 📝 Notas Técnicas

### Docker Compose (Desarrollo)

- Frontend hace llamadas a `/api/*`, Nginx las proxea al backend en la red Docker
- PostgreSQL se inicializa automáticamente con migración SQL en `/docker-entrypoint-initdb.d`
- Puertos expuestos: `8080` (frontend), `3000` (backend), `5432` (postgres)
- Hot-reload funcional para desarrollo (volúmenes montados)

### Kubernetes (Producción)

- **Imágenes locales**: Se construyen en EC2 con `imagePullPolicy: Never` (no requiere Docker Hub)
- **Inicialización DB**: Script `init-db.sh` ejecuta SQL vía `kubectl exec` en pod postgres
- **Networking**: 
  - Backend accesible como `backend:3000` (DNS interno de Kubernetes)
  - Frontend expuesto en `NodePort 30080` para acceso externo
- **Storage**: K3s usa `local-path` provisioner (almacenamiento en disco del nodo)
- **Limitaciones EC2 t2.micro**: 1 vCPU, 1GB RAM → limitar réplicas para evitar OOM
- **HTTPS**: Nginx en host EC2 hace reverse proxy a puerto 30080 de Kubernetes

### Optimizaciones Aplicadas

1. ✅ **Eliminación de duplicación**: SQL migrations en un solo lugar (`backend/migrations/`)
2. ✅ **Sin Docker Hub**: Imágenes se construyen localmente en EC2
3. ✅ **Archivos esenciales**: Solo 8 archivos en `k8s/` (eliminados scripts y docs redundantes)
4. ✅ **Validación flexible**: Schema Joi con `.unknown(true)` para evitar errores en ediciones

---

## 🔒 Seguridad (Producción)

Para un entorno de producción real, considera:

- [ ] Cambiar contraseñas por defecto
- [ ] Usar Secrets de Kubernetes para credenciales
- [ ] Implementar HTTPS con cert-manager
- [ ] Configurar Network Policies
- [ ] Usar imágenes escaneadas y firmadas
- [ ] Implementar RBAC en Kubernetes
- [ ] Configurar backups automáticos de PostgreSQL

---

## 🤝 Contribuciones

Este es un proyecto educativo. Pull requests y sugerencias son bienvenidos.

---

## 📄 Licencia

MIT (ejemplo educativo)

---

## 🆘 Soporte

Para problemas o dudas:

1. Revisa la sección de Troubleshooting en `k8s/README.md`
2. Verifica logs con `docker compose logs` o `kubectl logs`
3. Abre un issue en el repositorio
