#!/usr/bin/env bash
set -euo pipefail

NS=agenda-crud
: "${KUBECONFIG:=/etc/rancher/k3s/k3s.yaml}"

echo "Esperando a Postgres..."
kubectl -n "$NS" rollout status statefulset/postgres --timeout=180s

PG_POD=$(kubectl -n "$NS" get pod -l app=postgres -o jsonpath='{.items[0].metadata.name}')
echo "Usando pod: $PG_POD"

kubectl -n "$NS" exec -i "$PG_POD" -- bash -lc '
  set -euo pipefail
  export PGPASSWORD="${POSTGRES_PASSWORD}"
  for i in {1..30}; do
    if pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB" -h 127.0.0.1 -p 5432; then
      break
    fi
    sleep 2
  done
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
echo "Base inicializada."
