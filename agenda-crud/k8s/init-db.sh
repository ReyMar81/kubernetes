#!/usr/bin/env bash
set -euo pipefail

NS=agenda-crud
export KUBECONFIG=${KUBECONFIG:-/etc/rancher/k3s/k3s.yaml}

# Espera a que Postgres esté listo
echo "Esperando a Postgres..."
kubectl -n "$NS" rollout status statefulset/postgres --timeout=120s

# Ejecuta el SQL usando label selector (no nombre de pod)
PG_POD=$(kubectl -n "$NS" get pod -l app=postgres -o jsonpath='{.items[0].metadata.name}')
kubectl -n "$NS" exec -i "$PG_POD" -- bash -lc '
  export PGPASSWORD="${POSTGRES_PASSWORD}";
  psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -h 127.0.0.1 -p 5432 <<SQL
-- crea tablas si no existen...
CREATE TABLE IF NOT EXISTS contactos (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  telefono TEXT,
  email TEXT
);
SQL
'
echo "Base inicializada."
