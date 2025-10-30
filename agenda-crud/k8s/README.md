# Despliegue en Kubernetes (EC2)

## Pasos para desplegar:

### 1. En tu EC2, instala K3s (solo una vez):

```bash
curl -sfL https://get.k3s.io | sh -
sudo chmod 644 /etc/rancher/k3s/k3s.yaml
export KUBECONFIG=/etc/rancher/k3s/k3s.yaml
```

### 2. Construye las imágenes Docker:

```bash
cd agenda-crud
docker build -t agenda-backend:latest ./backend
docker build -t agenda-frontend:latest ./frontend
```

### 3. Despliega en Kubernetes:

```bash
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmaps.yaml
kubectl apply -f k8s/postgres-pvc.yaml
kubectl apply -f k8s/postgres-deployment.yaml

# Espera ~30 segundos a que postgres esté listo
kubectl wait --for=condition=ready pod -l app=postgres -n agenda-crud --timeout=60s

# Inicializa la base de datos
bash k8s/init-db.sh

# Despliega backend y frontend
kubectl apply -f k8s/backend-deployment.yaml
kubectl apply -f k8s/frontend-deployment.yaml
```

### 4. Verifica que todo esté corriendo:

```bash
kubectl get pods -n agenda-crud
```

### 5. Accede a tu aplicación:

```
http://<IP-DE-TU-EC2>:30080
```

## Para escalar (cambiar número de réplicas):

```bash
# Más backends:
kubectl scale deployment backend -n agenda-crud --replicas=5

# Más frontends:
kubectl scale deployment frontend -n agenda-crud --replicas=3

# Ver estado:
kubectl get pods -n agenda-crud
```

## Para eliminar todo:

```bash
kubectl delete namespace agenda-crud
```
