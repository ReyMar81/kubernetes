# Despliegue en Kubernetes (EC2)

Este proyecto implementa **Kubernetes (K3s)** en AWS EC2 para demostrar escalabilidad, auto-recuperación y orquestación de contenedores en producción.

## 📋 Requisitos

- Instancia EC2 (t2.micro free tier compatible)
- Ubuntu Server 22.04 LTS
- Puertos abiertos: 22 (SSH), 30080 (aplicación)
- Docker instalado
- Git instalado

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

```bash
# Crear namespace y configuración:
sudo -E kubectl apply -f k8s/namespace.yaml
sudo -E kubectl apply -f k8s/configmaps.yaml

# Desplegar PostgreSQL:
sudo -E kubectl apply -f k8s/postgres-pvc.yaml
sudo -E kubectl apply -f k8s/postgres-deployment.yaml

# Esperar a que postgres esté listo (~30-60 segundos):
sudo -E kubectl wait --for=condition=ready pod -l app=postgres -n agenda-crud --timeout=120s

# Inicializar base de datos:
sudo -E bash k8s/init-db.sh

# Desplegar backend y frontend:
sudo -E kubectl apply -f k8s/backend-deployment.yaml
sudo -E kubectl apply -f k8s/frontend-deployment.yaml
```

### 6. Verificar despliegue

```bash
# Ver todos los pods (deberías ver 5 pods):
sudo -E kubectl get pods -n agenda-crud

# Debería mostrar:
# - postgres-0 (1 pod)
# - backend-xxxxxx (2 réplicas)
# - frontend-xxxxxx (2 réplicas)

# Ver servicios:
sudo -E kubectl get svc -n agenda-crud
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
# Escalar backend a 5 réplicas:
sudo -E kubectl scale deployment backend -n agenda-crud --replicas=5

# Escalar frontend a 3 réplicas:
sudo -E kubectl scale deployment frontend -n agenda-crud --replicas=3

# Ver cambios en tiempo real:
sudo -E kubectl get pods -n agenda-crud -w
```

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

| Recurso             | Tipo             | Réplicas | Propósito                                               |
| ------------------- | ---------------- | -------- | ------------------------------------------------------- |
| `postgres-0`        | StatefulSet      | 1        | Base de datos PostgreSQL con almacenamiento persistente |
| `backend`           | Deployment       | 2        | API REST con balanceo de carga automático               |
| `frontend`          | Deployment       | 2        | Aplicación React servida por Nginx                      |
| `backend` (service) | ClusterIP        | -        | Servicio interno para backend                           |
| `frontend-service`  | NodePort (30080) | -        | Servicio público para acceso externo                    |
| `postgres-data`     | PVC              | 5GB      | Volumen persistente para datos PostgreSQL               |

## ⚠️ Troubleshooting

### Error: "TLS handshake timeout"

```bash
# Asegúrate de usar sudo -E:
export KUBECONFIG=/etc/rancher/k3s/k3s.yaml
sudo -E kubectl get nodes
```

### Pods en estado "Pending"

```bash
# Ver detalles del pod:
sudo -E kubectl describe pod <nombre-pod> -n agenda-crud

# Verificar recursos de la instancia:
free -h
```

### Frontend no carga o da error 404

```bash
# Verificar que el servicio esté en NodePort 30080:
sudo -E kubectl get svc frontend-service -n agenda-crud

# Verificar Security Group de EC2 permita puerto 30080
```

### Base de datos no inicializa

```bash
# Verificar logs de postgres:
sudo -E kubectl logs postgres-0 -n agenda-crud

# Ejecutar init-db.sh manualmente:
sudo -E bash k8s/init-db.sh
```

## 💡 Diferencias vs Docker Compose

Con Docker Compose (desarrollo local):

- ✅ Fácil de configurar
- ❌ Sin escalabilidad automática
- ❌ Sin auto-recuperación
- ❌ Un solo servidor

Con Kubernetes (producción):

- ✅ Escalabilidad horizontal automática
- ✅ Auto-recuperación de pods caídos
- ✅ Balanceo de carga integrado
- ✅ Rolling updates sin downtime
- ✅ Preparado para multi-servidor
- ⚠️ Mayor complejidad inicial
