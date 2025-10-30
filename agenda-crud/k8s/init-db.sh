#!/bin/bash
set -euo pipefail

echo "🔧 Inicializando base de datos PostgreSQL..."

# Esperar a que postgres esté listo
echo "⏳ Esperando a que PostgreSQL esté listo..."
kubectl wait --for=condition=ready pod -l app=postgres -n agenda-crud --timeout=60s

# Ejecutar migración dentro del pod de postgres
echo "📝 Ejecutando migración SQL..."
kubectl exec -n agenda-crud postgres-0 -- psql -U postgres -d agenda -c "
CREATE TABLE IF NOT EXISTS friends (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
"

echo ""
echo "✅ Base de datos inicializada correctamente!"
echo ""
echo "📊 Verificando tabla:"
kubectl exec -n agenda-crud postgres-0 -- psql -U postgres -d agenda -c "\dt"
