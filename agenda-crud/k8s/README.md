# Despliegue en Kubernetes (EC2)

Este proyecto implementa **Kubernetes (K3s)** en AWS EC2 para demostrar escalabilidad, auto-recuperación y orquestación de contenedores en producción.

## 🏗️ Arquitectura del Stack

```
┌─────────────────────────────────────────────────────────────┐
│                    Namespace: agenda-crud                    │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────┐      ┌──────────────┐      ┌────────────┐ │
│  │  Frontend   │◄─────┤   Ingress    │      │  Backend   │ │
│  │  (Nginx)    │      │  (Traefik)   │◄─────┤  (Node.js) │ │
│  │  Port: 80   │      │              │      │  Port: 3000│ │
│  │  Replicas:1 │      │  /    → 80   │      │  Replicas:2│ │
│  └─────────────┘      │  /api → 3000 │      └──────┬─────┘ │
│                       └──────────────┘             │        │
│                                                     │        │
│                                          ┌──────────▼─────┐ │
│                                          │   PostgreSQL   │ │
│                                          │   (StatefulSet)│ │
│                                          │   Port: 5432   │ │
│                                          │   PVC: 5GB     │ │
│                                          └────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## 📋 Requisitos

- Instancia EC2 (t2.micro free tier compatible - 1 vCPU, 1GB RAM)
- Ubuntu Server 22.04 LTS
- Puertos abiertos en Security Group:
  - 22 (SSH)
  - 30080 (NodePort - acceso HTTP a la aplicación)
  - 443 (HTTPS - opcional, si usas Ingress con certificado)
- Docker instalado
- Git instalado

## 📂 Estructura de Manifiestos YAML

```
k8s/
├── namespace.yaml              # Crea el namespace 'agenda-crud'
├── secret-backend.yaml         # Secret con DB_PASSWORD
├── configmaps.yaml             # ConfigMaps con variables de entorno
├── postgres-deployment.yaml    # StatefulSet de PostgreSQL + Services
├── backend-deployment.yaml     # Deployment del backend + Service
├── frontend-deployment.yaml    # Deployment del frontend + Service
├── ingress.yaml                # Ingress para enrutamiento (opcional)
└── init-db.sh                  # Script para crear tabla 'friends'
```

### 🔐 Detalles de cada archivo YAML

#### 1️⃣ `namespace.yaml`

Crea el namespace aislado donde vivirán todos los recursos.

```yaml
metadata:
  name: agenda-crud # ← Todos los demás manifiestos usan este namespace
```

#### 2️⃣ `secret-backend.yaml`

Almacena la contraseña de PostgreSQL de forma segura (base64).

```yaml
metadata:
  name: backend-secret # ← Referenciado en postgres y backend
stringData:
  DB_PASSWORD: "1234" # ← Contraseña de PostgreSQL (plano, K8s lo convierte)
```

**Usado por:**

- `postgres-deployment.yaml` → `POSTGRES_PASSWORD`
- `backend-deployment.yaml` → `DB_PASSWORD` (vía envFrom)

#### 3️⃣ `configmaps.yaml`

Contiene variables de configuración NO sensibles.

**backend-config:**

```yaml
data:
  DB_HOST: postgres # ← Nombre del Service headless de PostgreSQL
  DB_PORT: "5432" # ← Puerto estándar de PostgreSQL
  DB_NAME: agenda # ← Nombre de la base de datos
  DB_USER: agenda # ← Usuario de PostgreSQL
  DB_SSLMODE: disable # ← Desactiva SSL (desarrollo)
```

**Usado por:**

- `postgres-deployment.yaml` → `POSTGRES_DB`, `POSTGRES_USER`
- `backend-deployment.yaml` → Todas las variables (vía envFrom)

**frontend-config:**

```yaml
data:
  API_BASE_URL: /api # ← Ruta base para llamadas al backend
```

**Nota:** Esta variable solo se usa en build-time si se configura `VITE_API_BASE`. En runtime, el frontend hace llamadas a `/api/` y el Ingress las enruta al backend.

#### 4️⃣ `postgres-deployment.yaml`

Despliega PostgreSQL con almacenamiento persistente.

**Service headless:**

```yaml
metadata:
  name: postgres # ← El backend se conecta usando este nombre
spec:
  clusterIP: None # ← Headless: proporciona DNS estable para StatefulSet
  selector:
    app: postgres
```

**Service ClusterIP (adicional):**

```yaml
metadata:
  name: postgres-clusterip # ← Alternativa para acceso interno
spec:
  type: ClusterIP
```

**StatefulSet:**

```yaml
spec:
  replicas: 1 # ← Solo 1 réplica (PostgreSQL no clusterizado)
  template:
    spec:
      nodeSelector:
        role: db # ← Requiere que el nodo tenga label 'role=db'
      containers:
        - name: postgres
          image: postgres:16
          env:
            - name: POSTGRES_DB
              valueFrom:
                { configMapKeyRef: { name: backend-config, key: DB_NAME } }
            - name: POSTGRES_USER
              valueFrom:
                { configMapKeyRef: { name: backend-config, key: DB_USER } }
            - name: POSTGRES_PASSWORD
              valueFrom:
                { secretKeyRef: { name: backend-secret, key: DB_PASSWORD } }
          volumeMounts:
            - name: data
              mountPath: /var/lib/postgresql/data
  volumeClaimTemplates:
    - metadata:
        name: data # ← Crea PVC automáticamente: data-postgres-0
      spec:
        accessModes: ["ReadWriteOnce"]
        storageClassName: local-path # ← Storage de K3s (default)
        resources:
          requests:
            storage: 5Gi # ← 5GB de almacenamiento persistente
```

**Recursos:**

- Requests: 80m CPU, 256Mi RAM (mínimo garantizado)
- Limits: 200m CPU, 512Mi RAM (máximo permitido)

#### 5️⃣ `backend-deployment.yaml`

Despliega la API REST en Node.js/TypeScript.

**Service:**

```yaml
metadata:
  name: backend # ← El Ingress enruta /api a este servicio
spec:
  type: ClusterIP # ← Solo accesible internamente
  selector:
    app: backend
  ports:
    - port: 3000 # ← Puerto del servicio
      targetPort: 3000 # ← Puerto del contenedor
```

**Deployment:**

```yaml
spec:
  replicas: 2 # ← 2 réplicas para alta disponibilidad
  template:
    spec:
      containers:
        - name: backend
          image: reymar8181/agenda-crud-backend:latest # ← Imagen en Docker Hub
          imagePullPolicy: Always # ← Siempre descarga la última versión
          ports:
            - containerPort: 3000
          envFrom:
            - configMapRef: { name: backend-config } # ← Inyecta DB_HOST, DB_PORT, DB_NAME, DB_USER
            - secretRef: { name: backend-secret } # ← Inyecta DB_PASSWORD
          livenessProbe:
            httpGet: { path: /health, port: 3000 } # ← Verifica que el backend esté vivo
          readinessProbe:
            httpGet: { path: /health, port: 3000 } # ← Verifica que esté listo para tráfico
```

**Variables de entorno que el backend recibe:**

- `DB_HOST=postgres` (ConfigMap)
- `DB_PORT=5432` (ConfigMap)
- `DB_NAME=agenda` (ConfigMap)
- `DB_USER=agenda` (ConfigMap)
- `DB_PASSWORD=1234` (Secret)

**Código backend (src/db.ts):**

```typescript
const pool = new Pool({
  host: process.env.DB_HOST, // ← 'postgres'
  port: Number(process.env.DB_PORT), // ← 5432
  user: process.env.DB_USER, // ← 'agenda'
  password: process.env.DB_PASSWORD, // ← '1234'
  database: process.env.DB_NAME, // ← 'agenda'
});
```

**Recursos:**

- Requests: 70m CPU, 96Mi RAM
- Limits: 180m CPU, 192Mi RAM

#### 6️⃣ `frontend-deployment.yaml`

Despliega la interfaz React servida por Nginx.

**Service:**

```yaml
metadata:
  name: frontend # ← El Ingress enruta / a este servicio
spec:
  type: NodePort # ← Accesible externamente
  ports:
    - port: 80
      targetPort: 80
      nodePort: 30080 # ← Puerto expuesto: http://<IP-EC2>:30080
```

**Deployment:**

```yaml
spec:
  replicas: 1 # ← 1 réplica (suficiente para t2.micro)
  template:
    spec:
      containers:
        - name: frontend
          image: reymar8181/agenda-crud-frontend:latest
          imagePullPolicy: Always # ← Cambiado de IfNotPresent para desarrollo
          ports:
            - containerPort: 80
          envFrom:
            - configMapRef: { name: frontend-config }
```

**Recursos:**

- Requests: 40m CPU, 48Mi RAM
- Limits: 120m CPU, 96Mi RAM

#### 7️⃣ `ingress.yaml`

Enruta tráfico HTTP/HTTPS a los servicios correctos.

```yaml
metadata:
  annotations:
    kubernetes.io/ingress.class: traefik # ← K3s trae Traefik por defecto
    cert-manager.io/cluster-issuer: letsencrypt-http01 # ← Para certificados SSL
spec:
  tls:
    - hosts: [tu-dominio.duckdns.org] # ← CAMBIAR por tu dominio real
      secretName: agenda-tls
  rules:
    - host: tu-dominio.duckdns.org # ← CAMBIAR por tu dominio real
      http:
        paths:
          - path: /api # ← /api/friends → backend:3000
            pathType: Prefix
            backend:
              service:
                name: backend
                port: { number: 3000 }
          - path: / # ← / → frontend:80
            pathType: Prefix
            backend:
              service:
                name: frontend
                port: { number: 80 }
```

**IMPORTANTE:**

- Si solo usas IP (sin dominio): Accede por `http://<IP-EC2>:30080` (no necesitas Ingress)
- Si usas DuckDNS: Reemplaza `tu-dominio.duckdns.org` y accede por `https://tu-dominio.duckdns.org`

#### 8️⃣ `init-db.sh`

Script bash que crea la tabla `friends` en PostgreSQL.

```bash
# Espera a que el StatefulSet esté listo
kubectl -n agenda-crud rollout status statefulset/postgres --timeout=180s

# Obtiene el nombre del pod: postgres-0
PG_POD=$(kubectl -n agenda-crud get pod -l app=postgres -o jsonpath='{.items[0].metadata.name}')

# Ejecuta SQL dentro del pod
kubectl -n agenda-crud exec -i "$PG_POD" -- bash -lc '
  export PGPASSWORD="${POSTGRES_PASSWORD}"  # ← Usa el secret
  psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -h 127.0.0.1 -p 5432 <<SQL
CREATE TABLE IF NOT EXISTS friends (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
SQL
'
```

## 🚀 Pasos para desplegar

### 1. Preparar EC2

```bash
# Conectar a EC2:
ssh -i tu-llave.pem ubuntu@<IP-PUBLICA>

# Instalar Docker:
sudo apt update
sudo apt install -y docker.io git
sudo usermod -aG docker ubuntu
# Cerrar sesión y reconectar para aplicar permisos
```

### 2. Clonar el proyecto

```bash
git clone https://github.com/ReyMar81/kubernetes.git
cd kubernetes/agenda-crud
```

### 3. Instalar K3s (solo una vez)

```bash
# Instalar K3s (Kubernetes ligero):
curl -sfL https://get.k3s.io | sh -

# Configurar acceso (necesario para cada sesión):
export KUBECONFIG=/etc/rancher/k3s/k3s.yaml

# Verificar instalación:
sudo -E kubectl get nodes
```

### 4. Construir imágenes Docker

```bash
# Construir backend:
docker build -t agenda-backend:latest -f docker/backend.Dockerfile ./backend

# Construir frontend:
docker build -t agenda-frontend:latest -f docker/frontend.Dockerfile ./frontend

# Verificar imágenes:
docker images | grep agenda
```

### 5. Desplegar en Kubernetes

**⚠️ ORDEN IMPORTANTE: Sigue estos pasos exactamente en esta secuencia**

```bash
# ========================================
# PASO 1: Crear el namespace aislado
# ========================================
sudo -E kubectl apply -f k8s/namespace.yaml
# Crea: Namespace 'agenda-crud'
# Razón: Todos los demás recursos deben vivir dentro de este namespace

# ========================================
# PASO 2: Crear Secrets y ConfigMaps
# ========================================
sudo -E kubectl apply -f k8s/secret-backend.yaml
# Crea: Secret 'backend-secret' con DB_PASSWORD='1234'
# Usado por: postgres y backend

sudo -E kubectl apply -f k8s/configmaps.yaml
# Crea:
#   - ConfigMap 'backend-config' (DB_HOST, DB_PORT, DB_NAME, DB_USER)
#   - ConfigMap 'frontend-config' (API_BASE_URL)
# Razón: Los deployments necesitan estas variables antes de iniciarse

# ========================================
# PASO 3: Etiquetar nodo para PostgreSQL
# ========================================
sudo -E kubectl label nodes --all role=db
# Añade label 'role=db' a todos los nodos
# Razón: postgres-deployment.yaml tiene nodeSelector: role=db
# Sin esto, el pod quedará en estado "Pending"

# ========================================
# PASO 4: Desplegar PostgreSQL
# ========================================
sudo -E kubectl apply -f k8s/postgres-deployment.yaml
# Crea:
#   - Service 'postgres' (headless, clusterIP: None)
#   - Service 'postgres-clusterip' (ClusterIP)
#   - StatefulSet 'postgres' (1 réplica)
#   - PVC 'data-postgres-0' (5GB, local-path)
# Razón: La base de datos debe estar lista antes que el backend

# ========================================
# PASO 5: Esperar a que PostgreSQL esté ready
# ========================================
sudo -E kubectl wait --for=condition=ready pod -l app=postgres -n agenda-crud --timeout=180s
# Espera hasta 180 segundos a que postgres-0 esté "Ready"
# Razón: No podemos crear la tabla si PostgreSQL no está listo

# Verificar que postgres está corriendo:
sudo -E kubectl get pods -n agenda-crud
# Deberías ver: postgres-0   1/1   Running   0   X segundos

# ========================================
# PASO 6: Inicializar la base de datos
# ========================================
sudo -E bash k8s/init-db.sh
# Ejecuta SQL dentro del pod postgres-0:
#   - Se conecta con las credenciales del Secret y ConfigMap
#   - Crea la tabla 'friends' con campos: id, name, email, phone, notes, created_at, updated_at
# Razón: El backend necesita que esta tabla exista

# Verificar que la tabla se creó correctamente:
sudo -E kubectl exec -it postgres-0 -n agenda-crud -- psql -U agenda -d agenda -c "\dt friends"
# Deberías ver la tabla 'friends' listada

# ========================================
# PASO 7: Desplegar Backend (API REST)
# ========================================
sudo -E kubectl apply -f k8s/backend-deployment.yaml
# Crea:
#   - Service 'backend' (ClusterIP, port 3000)
#   - Deployment 'backend' (2 réplicas)
# Variables inyectadas:
#   - DB_HOST=postgres (ConfigMap)
#   - DB_PORT=5432 (ConfigMap)
#   - DB_NAME=agenda (ConfigMap)
#   - DB_USER=agenda (ConfigMap)
#   - DB_PASSWORD=1234 (Secret)
# Razón: El backend se conecta a postgres y expone /api/friends

# ========================================
# PASO 8: Desplegar Frontend (React + Nginx)
# ========================================
sudo -E kubectl apply -f k8s/frontend-deployment.yaml
# Crea:
#   - Service 'frontend' (NodePort 30080)
#   - Deployment 'frontend' (1 réplica)
# Razón: Sirve la interfaz web en http://<IP-EC2>:30080

# ========================================
# PASO 9 (OPCIONAL): Desplegar Ingress
# ========================================
# ⚠️ Solo si tienes un dominio (ejemplo: DuckDNS)
# Antes de aplicar, edita k8s/ingress.yaml y reemplaza:
#   'tu-dominio.duckdns.org' → tu dominio real

sudo -E kubectl apply -f k8s/ingress.yaml
# Crea: Ingress que enruta:
#   - https://tu-dominio.duckdns.org/api → backend:3000
#   - https://tu-dominio.duckdns.org/ → frontend:80
# Razón: Permite acceso por dominio con HTTPS
```

### 6. Verificar despliegue

```bash
# ========================================
# Ver todos los pods (deberías ver 4 pods)
# ========================================
sudo -E kubectl get pods -n agenda-crud

# Salida esperada:
# NAME                        READY   STATUS    RESTARTS   AGE
# postgres-0                  1/1     Running   0          5m
# backend-xxxxxxxxxx-xxxxx    1/1     Running   0          2m
# backend-xxxxxxxxxx-xxxxx    1/1     Running   0          2m
# frontend-xxxxxxxxxx-xxxxx   1/1     Running   0          1m

# ========================================
# Ver servicios
# ========================================
sudo -E kubectl get svc -n agenda-crud

# Salida esperada:
# NAME                 TYPE        CLUSTER-IP      EXTERNAL-IP   PORT(S)        AGE
# postgres             ClusterIP   None            <none>        5432/TCP       5m
# postgres-clusterip   ClusterIP   10.43.xxx.xxx   <none>        5432/TCP       5m
# backend              ClusterIP   10.43.xxx.xxx   <none>        3000/TCP       2m
# frontend             NodePort    10.43.xxx.xxx   <none>        80:30080/TCP   1m
#                                                                    ^^^^^^ Puerto externo

# ========================================
# Ver PersistentVolumeClaims (almacenamiento)
# ========================================
sudo -E kubectl get pvc -n agenda-crud

# Salida esperada:
# NAME               STATUS   VOLUME                                     CAPACITY   ACCESS MODES   STORAGECLASS   AGE
# data-postgres-0    Bound    pvc-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx   5Gi        RWO            local-path     5m

# ========================================
# Ver logs del backend (para debugging)
# ========================================
sudo -E kubectl logs -l app=backend -n agenda-crud --tail=50

# Salida esperada (sin errores):
# Server listening on port 3000
# Connected to PostgreSQL database

# ========================================
# Ver logs de postgres (para debugging)
# ========================================
sudo -E kubectl logs postgres-0 -n agenda-crud --tail=50

# Salida esperada:
# database system is ready to accept connections

# ========================================
# Verificar conectividad backend → postgres
# ========================================
sudo -E kubectl exec -it deployment/backend -n agenda-crud -- sh -c 'nc -zv $DB_HOST $DB_PORT'

# Salida esperada:
# postgres (10.43.xxx.xxx:5432) open

# ========================================
# Probar endpoint /health del backend
# ========================================
sudo -E kubectl run curl-test --image=curlimages/curl --rm -it --restart=Never -n agenda-crud -- curl -s http://backend:3000/health

# Salida esperada:
# {"ok":true}

# ========================================
# Probar endpoint /api/friends del backend
# ========================================
sudo -E kubectl run curl-test --image=curlimages/curl --rm -it --restart=Never -n agenda-crud -- curl -s http://backend:3000/api/friends

# Salida esperada (lista vacía al inicio):
# []
```

### 7. Acceder a la aplicación

```
http://<IP-PUBLICA-EC2>:30080
```

Si configuraste un dominio con DuckDNS y HTTPS, accede por:

```
https://tu-dominio.duckdns.org
```

## 🎯 Demostrar Kubernetes en acción

### Escalabilidad horizontal

```bash
# Escalar backend a 3 réplicas:
sudo -E kubectl scale deployment backend -n agenda-crud --replicas=3

# Volver a escalar frontend a 2 réplicas:
sudo -E kubectl scale deployment frontend -n agenda-crud --replicas=2

# Ver cambios en tiempo real:
sudo -E kubectl get pods -n agenda-crud -w
```

**Nota**: En t2.micro (1 vCPU, 1GB RAM), mantén réplicas conservadoras para evitar falta de recursos.

### Auto-recuperación (self-healing)

```bash
# Eliminar un pod manualmente:
sudo -E kubectl delete pod <nombre-pod-backend> -n agenda-crud

# Kubernetes lo recrea automáticamente en segundos:
sudo -E kubectl get pods -n agenda-crud -w
```

### Ver logs en tiempo real

```bash
# Logs de todos los backends:
sudo -E kubectl logs -f -l app=backend -n agenda-crud

# Logs de un pod específico:
sudo -E kubectl logs -f <nombre-pod> -n agenda-crud
```

### Rolling updates (actualizaciones sin downtime)

```bash
# Después de cambiar código y reconstruir imagen:
docker build -t agenda-backend:latest -f docker/backend.Dockerfile ./backend

# Forzar actualización de pods:
sudo -E kubectl rollout restart deployment backend -n agenda-crud

# Ver progreso:
sudo -E kubectl rollout status deployment backend -n agenda-crud
```

## 🧹 Limpieza

```bash
# Eliminar toda la aplicación (mantiene K3s):
sudo -E kubectl delete namespace agenda-crud

# Desinstalar K3s completamente:
/usr/local/bin/k3s-uninstall.sh
```

## 📊 Recursos desplegados

| Recurso               | Tipo             | Réplicas | CPU (req/lim) | RAM (req/lim) | Propósito                                               |
| --------------------- | ---------------- | -------- | ------------- | ------------- | ------------------------------------------------------- |
| `postgres-0`          | StatefulSet      | 1        | 80m / 200m    | 256Mi / 512Mi | Base de datos PostgreSQL con almacenamiento persistente |
| `backend`             | Deployment       | 2        | 70m / 180m    | 96Mi / 192Mi  | API REST (Node.js) con balanceo de carga automático     |
| `frontend`            | Deployment       | 1        | 40m / 120m    | 48Mi / 96Mi   | SPA React servida por Nginx                             |
| `postgres` (headless) | Service          | -        | -             | -             | DNS estable para StatefulSet (clusterIP: None)          |
| `postgres-clusterip`  | ClusterIP        | -        | -             | -             | Acceso interno a PostgreSQL (10.43.x.x:5432)            |
| `backend`             | ClusterIP        | -        | -             | -             | Servicio interno para backend (10.43.x.x:3000)          |
| `frontend`            | NodePort (30080) | -        | -             | -             | Servicio público para acceso externo (<IP-EC2>:30080)   |
| `data-postgres-0`     | PVC              | 1        | -             | 5Gi           | Volumen persistente para /var/lib/postgresql/data       |

### 💰 Cálculo de recursos para t2.micro (1 vCPU = 1000m, 1GB RAM ≈ 950Mi)

**Configuración actual (optimizada para t2.micro):**

| Métrica      | Postgres | Backend (x2) | Frontend | **TOTAL** | Capacidad t2.micro | Margen |
| ------------ | -------- | ------------ | -------- | --------- | ------------------ | ------ |
| CPU requests | 80m      | 140m         | 40m      | **260m**  | ~700m disponible   | ✅ 73% |
| CPU limits   | 200m     | 360m         | 120m     | **680m**  | 1000m              | ✅ 32% |
| RAM requests | 256Mi    | 192Mi        | 48Mi     | **496Mi** | ~550Mi disponible  | ✅ 10% |
| RAM limits   | 512Mi    | 384Mi        | 96Mi     | **992Mi** | 950Mi              | ⚠️ -4% |

**Notas:**

- ✅ **Requests garantizados**: Kubernetes asegura que cada pod tenga estos recursos mínimos
- ⚠️ **Limits al borde**: Los límites están ajustados. Si todos los pods usan el máximo simultáneamente, puede haber presión de memoria
- 🎯 **Recomendación**: Esta configuración es viable pero ajustada. Monitorea con `kubectl top pods -n agenda-crud`

**Si experimentas OOMKilled (Out Of Memory):**

```bash
# Reducir backend a 1 réplica temporalmente:
sudo -E kubectl scale deployment backend -n agenda-crud --replicas=1
```

## ⚠️ Troubleshooting

### Error: "TLS handshake timeout" o "connection refused"

**Causa:** No tienes permisos o la variable KUBECONFIG no está configurada.

```bash
# Solución: Asegúrate de usar sudo -E (preserva variables de entorno)
export KUBECONFIG=/etc/rancher/k3s/k3s.yaml
sudo -E kubectl get nodes

# Alternativa: Dar permisos al archivo kubeconfig
sudo chmod 644 /etc/rancher/k3s/k3s.yaml
kubectl --kubeconfig=/etc/rancher/k3s/k3s.yaml get nodes
```

---

### Pods en estado "Pending"

**Causa:** Recursos insuficientes o nodeSelector no coincide.

```bash
# Ver por qué está pendiente:
sudo -E kubectl describe pod <nombre-pod> -n agenda-crud

# Busca en la sección Events:
# - "Insufficient cpu" → No hay suficiente CPU disponible
# - "Insufficient memory" → No hay suficiente RAM disponible
# - "node(s) didn't match Pod's node affinity/selector" → Falta label role=db

# Solución 1: Agregar label role=db (para postgres)
sudo -E kubectl label nodes --all role=db

# Solución 2: Verificar recursos disponibles
free -h
sudo -E kubectl top nodes  # Requiere metrics-server

# Solución 3: Reducir réplicas temporalmente
sudo -E kubectl scale deployment backend -n agenda-crud --replicas=1
```

---

### Frontend no carga o da error 404

**Causa:** Service no está en NodePort 30080 o Security Group bloquea el puerto.

```bash
# Verificar que el servicio esté correcto:
sudo -E kubectl get svc frontend -n agenda-crud

# Salida esperada:
# NAME       TYPE       CLUSTER-IP      EXTERNAL-IP   PORT(S)        AGE
# frontend   NodePort   10.43.xxx.xxx   <none>        80:30080/TCP   5m
#                                                         ^^^^^^ Debe ser 30080

# Verificar Security Group de EC2:
# 1. Ve a la consola de AWS EC2
# 2. Selecciona tu instancia → Security → Security groups
# 3. Edita "Inbound rules"
# 4. Agrega regla: Custom TCP, Port 30080, Source 0.0.0.0/0

# Verificar que el pod esté corriendo:
sudo -E kubectl get pods -l app=frontend -n agenda-crud

# Acceder localmente desde EC2:
curl http://localhost:30080
# Debería devolver HTML de la aplicación
```

---

### Base de datos no inicializa (tabla 'friends' no existe)

**Causa:** El script init-db.sh no se ejecutó o falló.

```bash
# Verificar logs de postgres:
sudo -E kubectl logs postgres-0 -n agenda-crud

# Verificar que postgres esté ready:
sudo -E kubectl get pods -l app=postgres -n agenda-crud
# STATUS debe ser "Running" y READY "1/1"

# Verificar que el nodo tenga la etiqueta role=db:
sudo -E kubectl get nodes --show-labels | grep role=db

# Si falta la etiqueta, añadirla:
sudo -E kubectl label nodes --all role=db

# Ejecutar init-db.sh manualmente:
sudo -E bash k8s/init-db.sh

# Verificar que la tabla se creó:
sudo -E kubectl exec -it postgres-0 -n agenda-crud -- psql -U agenda -d agenda -c "SELECT * FROM friends;"
# Debería devolver: "(0 rows)" si está vacía, o los registros si hay datos
```

---

### Backend no puede conectar a PostgreSQL

**Causa:** Variables de entorno incorrectas o postgres no está ready.

```bash
# Verificar variables de entorno del backend:
sudo -E kubectl exec -it deployment/backend -n agenda-crud -- env | grep DB_

# Salida esperada:
# DB_HOST=postgres
# DB_PORT=5432
# DB_NAME=agenda
# DB_USER=agenda
# DB_PASSWORD=1234

# Verificar que postgres esté accesible:
sudo -E kubectl exec -it deployment/backend -n agenda-crud -- nc -zv postgres 5432
# Salida: "postgres (10.43.x.x:5432) open"

# Ver logs del backend:
sudo -E kubectl logs -l app=backend -n agenda-crud --tail=100

# Busca errores como:
# - "ECONNREFUSED" → postgres no está corriendo
# - "password authentication failed" → DB_PASSWORD incorrecto
# - "database 'agenda' does not exist" → Postgres no inicializado correctamente
```

---

### Pod en estado "CrashLoopBackOff"

**Causa:** El contenedor se inicia pero falla inmediatamente.

```bash
# Ver logs del pod que falla:
sudo -E kubectl logs <nombre-pod> -n agenda-crud --previous

# Causas comunes:
# - Backend: Error al conectar a postgres (verifica DB_HOST, DB_PASSWORD)
# - Postgres: Falta PVC o permisos incorrectos (fsGroup: 999)
# - Frontend: Error en el build de la imagen Docker

# Describir el pod para más detalles:
sudo -E kubectl describe pod <nombre-pod> -n agenda-crud
```

---

### PostgreSQL en estado "Pending" con nodeSelector

**Causa:** Ningún nodo tiene la etiqueta `role=db`.

```bash
# Verificar etiquetas de los nodos:
sudo -E kubectl get nodes --show-labels

# Busca: role=db
# Si no existe, agrégala:
sudo -E kubectl label nodes <nombre-nodo> role=db

# Para etiquetar TODOS los nodos (recomendado en single-node):
sudo -E kubectl label nodes --all role=db

# Verificar que postgres se programe:
sudo -E kubectl get pods -n agenda-crud -w
```

---

### Ingress no funciona (404 o Connection Refused)

**Causa:** Traefik no está instalado, dominio incorrecto o certificado no emitido.

```bash
# Verificar que Traefik esté corriendo (viene con K3s):
sudo -E kubectl get pods -n kube-system | grep traefik

# Verificar el Ingress:
sudo -E kubectl get ingress -n agenda-crud

# Salida esperada:
# NAME             CLASS     HOSTS                    ADDRESS         PORTS     AGE
# agenda-ingress   traefik   tu-dominio.duckdns.org   192.168.x.x     80, 443   5m

# Verificar que el dominio apunte a la IP de EC2:
nslookup tu-dominio.duckdns.org
# Debe devolver la IP pública de tu instancia EC2

# Verificar certificado SSL (si usas HTTPS):
sudo -E kubectl get certificate -n agenda-crud
sudo -E kubectl describe certificate agenda-tls -n agenda-crud

# Si el certificado falla:
# - Verifica que cert-manager esté instalado
# - Verifica que el puerto 80 esté abierto (Let's Encrypt usa HTTP-01 challenge)
```

---

### Error "OOMKilled" (Out of Memory)

**Causa:** Un pod excedió su límite de memoria.

```bash
# Ver qué pod fue killed:
sudo -E kubectl get pods -n agenda-crud

# STATUS mostrará "OOMKilled"

# Ver consumo de memoria:
sudo -E kubectl top pods -n agenda-crud

# Soluciones:
# 1. Reducir réplicas:
sudo -E kubectl scale deployment backend -n agenda-crud --replicas=1

# 2. Aumentar límites en el YAML (si tienes más recursos):
# Edita backend-deployment.yaml:
#   limits: { cpu: "200m", memory: "256Mi" }

# 3. Ver consumo del sistema:
free -h
```

---

### Pods tardan mucho en iniciarse

**Causa:** imagePullPolicy: Always descarga la imagen cada vez.

```bash
# Ver eventos:
sudo -E kubectl get events -n agenda-crud --sort-by='.lastTimestamp'

# Si ves "Pulling image":
# - Cambia imagePullPolicy a IfNotPresent en los deployments
# - O pre-descarga las imágenes:
docker pull reymar8181/agenda-crud-backend:latest
docker pull reymar8181/agenda-crud-frontend:latest
```

## 💡 Diferencias vs Docker Compose

| Aspecto               | Docker Compose (desarrollo)        | Kubernetes (producción)                   |
| --------------------- | ---------------------------------- | ----------------------------------------- |
| **Configuración**     | ✅ Fácil (1 archivo YAML)          | ⚠️ Compleja (múltiples manifiestos)       |
| **Escalabilidad**     | ❌ Manual (`docker-compose scale`) | ✅ Automática (HPA - Horizontal Pod Auto) |
| **Auto-recuperación** | ❌ No (si cae, queda caído)        | ✅ Sí (self-healing automático)           |
| **Balanceo de carga** | ❌ No integrado                    | ✅ Sí (Services con ClusterIP)            |
| **Rolling updates**   | ❌ Downtime al actualizar          | ✅ Zero-downtime deployments              |
| **Multi-servidor**    | ❌ Un solo host                    | ✅ Multi-nodo (cluster)                   |
| **Almacenamiento**    | ✅ Volumes locales simples         | ✅ PVC persistentes (migran con pods)     |
| **Secrets**           | ⚠️ .env en texto plano             | ✅ Secrets base64 + RBAC                  |
| **Monitoreo**         | ❌ Logs básicos                    | ✅ Prometheus, Grafana, kubectl top       |
| **Networking**        | ⚠️ Bridge simple                   | ✅ CNI avanzado (pod-to-pod encryption)   |
| **Health checks**     | ⚠️ Básicos                         | ✅ Liveness, Readiness, Startup probes    |
| **Uso de recursos**   | ❌ Sin límites                     | ✅ Requests/Limits por pod                |
| **Caso de uso ideal** | Desarrollo local, testing          | Producción, alta disponibilidad           |

**Ejemplo concreto en este proyecto:**

**Docker Compose:**

```yaml
services:
  backend:
    build: ./backend
    environment:
      - DB_PASSWORD=1234 # ← Texto plano en el archivo
    ports:
      - "3000:3000"
```

- ❌ Si el contenedor crashea, queda caído hasta que lo reinicies manualmente
- ❌ No hay balanceo de carga si corres múltiples instancias
- ❌ Para actualizar: `docker-compose down && docker-compose up` (downtime)

**Kubernetes:**

```yaml
apiVersion: apps/v1
kind: Deployment
spec:
  replicas: 2 # ← 2 pods con balanceo automático
  template:
    spec:
      containers:
        - name: backend
          envFrom:
            - secretRef: { name: backend-secret } # ← Secret separado
          livenessProbe:
            httpGet: { path: /health, port: 3000 } # ← Auto-reinicia si falla
```

- ✅ Si un pod crashea, Kubernetes lo recrea automáticamente en segundos
- ✅ Las 2 réplicas tienen balanceo de carga automático (Service)
- ✅ Para actualizar: `kubectl set image` hace rolling update sin downtime

---

## 🚀 Comandos útiles de Kubernetes

### Monitoreo y debugging

```bash
# Ver todos los recursos en el namespace:
sudo -E kubectl get all -n agenda-crud

# Ver consumo de recursos en tiempo real:
sudo -E kubectl top pods -n agenda-crud
sudo -E kubectl top nodes

# Ver eventos recientes (útil para debugging):
sudo -E kubectl get events -n agenda-crud --sort-by='.lastTimestamp' | tail -20

# Seguir logs en tiempo real (todas las réplicas):
sudo -E kubectl logs -f -l app=backend -n agenda-crud --max-log-requests=10

# Entrar a un pod (shell interactivo):
sudo -E kubectl exec -it deployment/backend -n agenda-crud -- sh

# Dentro del pod, puedes:
env | grep DB_        # Ver variables de entorno
nc -zv postgres 5432  # Test conectividad a postgres
wget -O- http://localhost:3000/health  # Test endpoint local
```

### Escalabilidad

```bash
# Escalar backend a 3 réplicas:
sudo -E kubectl scale deployment backend -n agenda-crud --replicas=3

# Ver el proceso de escalado en tiempo real:
sudo -E kubectl get pods -n agenda-crud -w

# Volver a 2 réplicas:
sudo -E kubectl scale deployment backend -n agenda-crud --replicas=2
```

### Actualizaciones

```bash
# Actualizar imagen del backend (después de rebuild):
sudo -E kubectl set image deployment/backend backend=reymar8181/agenda-crud-backend:v2 -n agenda-crud

# Ver progreso del rolling update:
sudo -E kubectl rollout status deployment/backend -n agenda-crud

# Rollback si algo salió mal:
sudo -E kubectl rollout undo deployment/backend -n agenda-crud

# Ver historial de rollouts:
sudo -E kubectl rollout history deployment/backend -n agenda-crud
```

### Limpieza y mantenimiento

```bash
# Reiniciar un deployment (recrea todos los pods):
sudo -E kubectl rollout restart deployment/backend -n agenda-crud

# Eliminar un pod específico (se recrea automáticamente):
sudo -E kubectl delete pod <nombre-pod> -n agenda-crud

# Eliminar todo el namespace (CUIDADO: borra todo):
sudo -E kubectl delete namespace agenda-crud

# Limpiar recursos no utilizados:
docker system prune -a  # Limpia imágenes de Docker
```

### Backup y restore

```bash
# Backup de la base de datos:
sudo -E kubectl exec postgres-0 -n agenda-crud -- pg_dump -U agenda agenda > backup.sql

# Restore de la base de datos:
sudo -E kubectl exec -i postgres-0 -n agenda-crud -- psql -U agenda -d agenda < backup.sql

# Exportar todos los manifiestos actuales:
sudo -E kubectl get all,configmap,secret,pvc,ingress -n agenda-crud -o yaml > backup-k8s.yaml
```

---

## 📚 Recursos adicionales

- **Documentación oficial de Kubernetes**: https://kubernetes.io/docs/
- **K3s (Kubernetes ligero)**: https://k3s.io/
- **Traefik (Ingress Controller)**: https://doc.traefik.io/traefik/
- **Cert-Manager (SSL/TLS)**: https://cert-manager.io/
- **Kubectl Cheat Sheet**: https://kubernetes.io/docs/reference/kubectl/cheatsheet/

---

## 🎓 Conceptos clave explicados

### ¿Qué es un Pod?

- Unidad más pequeña en Kubernetes
- Puede tener 1+ contenedores (generalmente 1)
- Comparten red y volúmenes
- Efímeros: pueden ser eliminados y recreados

### ¿Qué es un Deployment?

- Controla múltiples Pods réplicas
- Garantiza que siempre haya N réplicas corriendo
- Maneja rolling updates y rollbacks
- En este proyecto: `backend` y `frontend` son Deployments

### ¿Qué es un StatefulSet?

- Similar a Deployment pero para aplicaciones con estado
- Garantiza identidad de red estable (postgres-0, postgres-1...)
- Garantiza orden de creación/eliminación
- En este proyecto: `postgres` es StatefulSet

### ¿Qué es un Service?

- Abstracción que expone Pods a la red
- Tipos:
  - **ClusterIP**: Solo accesible dentro del cluster (backend, postgres)
  - **NodePort**: Accesible desde fuera en un puerto (frontend:30080)
  - **LoadBalancer**: Crea un balanceador externo (AWS ELB)
  - **Headless** (clusterIP: None): DNS directo a Pods (postgres StatefulSet)

### ¿Qué es un Ingress?

- Enruta tráfico HTTP/HTTPS externo a Services internos
- Permite usar dominios y paths (`/api` → backend, `/` → frontend)
- Requiere un Ingress Controller (Traefik en K3s)
- Soporta SSL/TLS con cert-manager

### ¿Qué es un PVC (PersistentVolumeClaim)?

- Solicitud de almacenamiento persistente
- Se crea automáticamente con volumeClaimTemplates en StatefulSet
- En este proyecto: `data-postgres-0` guarda los datos de PostgreSQL
- Sobrevive a la eliminación del Pod

---

## ✅ Checklist de despliegue

- [ ] Instancia EC2 creada y SSH configurado
- [ ] Security Group permite puertos 22, 30080, (443 opcional)
- [ ] Docker instalado (`docker --version`)
- [ ] Git instalado (`git --version`)
- [ ] Repositorio clonado (`cd kubernetes/agenda-crud`)
- [ ] K3s instalado (`sudo -E kubectl get nodes`)
- [ ] Imágenes Docker construidas localmente o disponibles en Docker Hub
- [ ] Namespace creado (`kubectl get ns agenda-crud`)
- [ ] Secrets aplicados (`kubectl get secret -n agenda-crud`)
- [ ] ConfigMaps aplicados (`kubectl get cm -n agenda-crud`)
- [ ] Nodos etiquetados con role=db (`kubectl get nodes --show-labels`)
- [ ] PostgreSQL corriendo (`kubectl get pods -l app=postgres -n agenda-crud`)
- [ ] Tabla friends creada (`bash k8s/init-db.sh`)
- [ ] Backend corriendo (`kubectl get pods -l app=backend -n agenda-crud`)
- [ ] Frontend corriendo (`kubectl get pods -l app=frontend -n agenda-crud`)
- [ ] Aplicación accesible en `http://<IP-EC2>:30080`
- [ ] (Opcional) Dominio configurado en DuckDNS
- [ ] (Opcional) Ingress aplicado y certificado emitido

---

**🎉 ¡Listo! Ahora tienes un stack completo corriendo en Kubernetes.**
