#!/bin/bash

# Script para solucionar problemas comunes de Git en Replit
echo "Solucionando problemas de Git..."

# Verificar el estado actual
echo "Estado actual del repositorio:"
git status --porcelain 2>/dev/null || echo "Error al obtener estado de Git"

# Intentar limpiar archivos temporales y de bloqueo
echo "Limpiando archivos temporales..."
find . -name "*.tmp" -delete 2>/dev/null || true
find . -name "*.temp" -delete 2>/dev/null || true

# Verificar si hay cambios pendientes
echo "Verificando cambios pendientes..."
git add . 2>/dev/null || echo "No se pudieron agregar archivos"

# Intentar commit si hay cambios
git commit -m "Auto-commit para solucionar problemas de Git" 2>/dev/null || echo "No hay cambios para commitear"

echo "Proceso completado. Si el problema persiste, intenta refrescar la página."