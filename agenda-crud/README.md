# agenda-crud

Proyecto full-stack con React + Vite (frontend), Node.js + Express (backend) y PostgreSQL, preparado para ejecutarse tanto con **Docker Compose** (desarrollo local) como con **Kubernetes** (producción en AWS EC2).

## 🎯 Características

- **Frontend**: React + Vite (TypeScript) servido por Nginx
- **Backend**: Node.js + Express (TypeScript) con API REST
- **Base de datos**: PostgreSQL 15
- **Contenedores**: Docker para cada servicio
- **Orquestación**: Docker Compose + Kubernetes
- **CRUD completo**: Gestión de amigos (id, name, email, phone, notes, created_at, updated_at)

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

Despliegue escalable y resiliente en Kubernetes usando una instancia EC2 de AWS (free tier compatible).

### Características de Kubernetes implementadas

✅ **Escalabilidad horizontal**: Múltiples réplicas de backend y frontend  
✅ **Auto-recuperación**: Pods se recrean automáticamente si fallan  
✅ **Load balancing**: Distribución automática de tráfico  
✅ **Rolling updates**: Actualizaciones sin downtime  
✅ **Health checks**: Liveness y readiness probes  
✅ **Persistent storage**: Datos de PostgreSQL persistentes  
✅ **Gestión de secretos**: ConfigMaps y Secrets para configuración

### Arquitectura Kubernetes

```
EC2 Instance (K3s Cluster)
├── Frontend Deployment (2 réplicas)
│   └── NodePort 30080
├── Backend Deployment (2 réplicas)
│   └── ClusterIP Service
└── PostgreSQL StatefulSet (1 réplica)
    └── PersistentVolumeClaim (5GB)
```

### Guía completa de despliegue

Consulta la **[Guía de Kubernetes](k8s/README.md)** para instrucciones detalladas sobre:

1. Construir y publicar imágenes Docker
2. Crear y configurar instancia EC2
3. Instalar K3s (Kubernetes ligero)
4. Desplegar la aplicación
5. Demostrar escalabilidad y auto-recuperación
6. Comparativa Docker Compose vs Kubernetes

**Acceso rápido**:

```bash
cd k8s/
./deploy.sh
```

**URL de acceso**: `http://<EC2_PUBLIC_IP>:30080`

---

## 📊 Comparación: Docker Compose vs Kubernetes

| Característica          | Docker Compose   | Kubernetes |
| ----------------------- | ---------------- | ---------- |
| **Uso recomendado**     | Desarrollo local | Producción |
| **Escalabilidad**       | Manual           | Automática |
| **Alta disponibilidad** | ❌ No            | ✅ Sí      |
| **Auto-recuperación**   | ❌ No            | ✅ Sí      |
| **Load balancing**      | Básico           | Avanzado   |
| **Multi-servidor**      | ❌ No            | ✅ Sí      |
| **Complejidad**         | Baja             | Media      |

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

### Docker Compose

- Orquestación multi-contenedor
- Redes privadas
- Volúmenes persistentes
- Variables de entorno

### Kubernetes

- Deployments y ReplicaSets
- Services (ClusterIP, NodePort)
- StatefulSets para bases de datos
- ConfigMaps y Secrets
- PersistentVolumeClaims
- Health probes (liveness/readiness)
- Escalabilidad horizontal
- Self-healing
- Rolling updates

---

## 📝 Notas

### Docker Compose

- El frontend hace llamadas a `/api/*`; Nginx las proxea al backend dentro de la red de Docker
- La BD se inicializa automáticamente con la migración SQL la primera vez
- Puertos expuestos: 8080 (frontend), 3000 (backend), 5432 (postgres)

### Kubernetes

- Requiere publicar imágenes en Docker Hub antes de desplegar
- En EC2 free tier (t2.micro) limitar réplicas para evitar falta de recursos
- K3s es una distribución ligera de Kubernetes ideal para edge/IoT/desarrollo
- El almacenamiento usa `local-path` en K3s (no EBS como en EKS)

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
