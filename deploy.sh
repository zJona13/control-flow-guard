#!/bin/bash

# Script de despliegue automatizado para Control Flow Guard
# Este script te guiará a través del proceso de despliegue

echo "🚀 Control Flow Guard - Script de Despliegue"
echo "=============================================="
echo ""

# Verificar que estamos en el directorio correcto
if [ ! -f "package.json" ] || [ ! -d "backend" ]; then
    echo "❌ Error: Ejecuta este script desde la raíz del proyecto"
    exit 1
fi

echo "✅ Directorio del proyecto detectado"
echo ""

# Verificar que Git esté configurado
if ! git status &> /dev/null; then
    echo "❌ Error: No se detectó un repositorio Git"
    echo "💡 Ejecuta: git init && git add . && git commit -m 'Initial commit'"
    exit 1
fi

echo "✅ Repositorio Git detectado"
echo ""

# Verificar que no haya cambios sin commitear
if ! git diff-index --quiet HEAD --; then
    echo "⚠️  Hay cambios sin commitear. ¿Quieres commitearlos ahora? (y/n)"
    read -r response
    if [ "$response" = "y" ] || [ "$response" = "Y" ]; then
        git add .
        git commit -m "Preparar para despliegue"
        echo "✅ Cambios commiteados"
    else
        echo "❌ Por favor, commitea tus cambios antes de continuar"
        exit 1
    fi
fi

echo "✅ Todo está listo para el despliegue"
echo ""

# Mostrar opciones de despliegue
echo "📋 Opciones de despliegue disponibles:"
echo ""
echo "1. 🎯 RECOMENDADO: Vercel (Frontend) + Railway (Backend)"
echo "2. 🚂 Todo en Railway"
echo "3. 🌐 Netlify (Frontend) + Railway (Backend)"
echo ""

read -p "Selecciona una opción (1-3): " choice

case $choice in
    1)
        echo ""
        echo "🎯 Despliegue con Vercel + Railway"
        echo "=================================="
        echo ""
        echo "📝 Pasos a seguir:"
        echo ""
        echo "1. 🌐 FRONTEND (Vercel):"
        echo "   • Ve a https://vercel.com"
        echo "   • Conecta tu repositorio de GitHub"
        echo "   • Framework: Vite"
        echo "   • Root Directory: ."
        echo "   • Build Command: npm ci && npm run build"
        echo "   • Output Directory: dist"
        echo "   • Install Command: npm ci"
        echo "   • Variable de entorno: VITE_API_URL=https://tu-backend.railway.app"
        echo ""
        echo "2. 🚂 BACKEND (Railway):"
        echo "   • Ve a https://railway.app"
        echo "   • Conecta tu repositorio de GitHub"
        echo "   • Selecciona la carpeta 'backend'"
        echo "   • Variables de entorno:"
        echo "     - NODE_ENV=production"
        echo "     - JWT_SECRET=tu-secreto-jwt-super-seguro"
        echo "     - FRONTEND_URL=https://tu-app.vercel.app"
        echo "   • Railway creará automáticamente MySQL"
        echo ""
        echo "3. 🗄️ BASE DE DATOS:"
        echo "   • Railway creará automáticamente MySQL"
        echo "   • Usa las credenciales que Railway te proporcione"
        echo "   • El script de inicialización se ejecutará automáticamente"
        echo ""
        ;;
    2)
        echo ""
        echo "🚂 Despliegue completo en Railway"
        echo "================================"
        echo ""
        echo "📝 Pasos a seguir:"
        echo ""
        echo "1. 🚂 RAILWAY:"
        echo "   • Ve a https://railway.app"
        echo "   • Crea dos servicios: uno para frontend, otro para backend"
        echo "   • Frontend: Root Directory: ."
        echo "   • Backend: Root Directory: backend"
        echo "   • Railway creará automáticamente MySQL"
        echo ""
        ;;
    3)
        echo ""
        echo "🌐 Despliegue con Netlify + Railway"
        echo "==================================="
        echo ""
        echo "📝 Pasos a seguir:"
        echo ""
        echo "1. 🌐 FRONTEND (Netlify):"
        echo "   • Ve a https://netlify.com"
        echo "   • Conecta tu repositorio de GitHub"
        echo "   • Build Command: npm run build"
        echo "   • Publish Directory: dist"
        echo ""
        echo "2. 🚂 BACKEND (Railway):"
        echo "   • Ve a https://railway.app"
        echo "   • Conecta tu repositorio de GitHub"
        echo "   • Selecciona la carpeta 'backend'"
        echo ""
        ;;
    *)
        echo "❌ Opción inválida"
        exit 1
        ;;
esac

echo ""
echo "🔐 CREDENCIALES INICIALES:"
echo "   Email: admin@essalud.gob.pe"
echo "   Password: admin123"
echo ""

echo "📚 DOCUMENTACIÓN COMPLETA:"
echo "   Ver DEPLOYMENT.md para instrucciones detalladas"
echo ""

echo "🎉 ¡Listo! Sigue los pasos arriba para desplegar tu aplicación"
echo ""
echo "💡 TIP: Mantén este terminal abierto para ver los logs de despliegue"
