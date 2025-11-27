#!/bin/bash

echo "🚀 Desplegando Física Modelo en Vercel..."

# Verificar si Vercel CLI está instalado
if ! command -v vercel &> /dev/null; then
    echo "📦 Instalando Vercel CLI..."
    npm install -g vercel
fi

# Iniciar sesión si no está hecho
echo "🔐 Verificando autenticación..."
vercel login

# Desplegar
echo "🌐 Desplegando proyecto..."
vercel --prod

echo "✅ Despliegue completado!"
echo "🔗 Tu sitio estará disponible en la URL que Vercel te proporcione"
