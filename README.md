# Simulador Interactivo de Sustentación Aerodinámica

Este proyecto es una simulación web interactiva de la sustentación en un ala de avión, desarrollada con p5.js. Permite explorar los principios físicos de Bernoulli y las fuerzas aerodinámicas de manera visual y educativa.

## Características
- **Visualización**: Usa una imagen de fondo con avión y flujos aerodinámicos.
- **Interactividad**: Deslizador para ajustar el ángulo de ataque.
- **Vectores Dinámicos**: Flechas de sustentación (verde) y peso (rojo) que cambian en tiempo real.
- **Datos en Tiempo Real**: Panel con ecuaciones de Bernoulli y valores calculados.
- **Idioma**: Todo en castellano.
- **Compatibilidad Multi-dispositivo**: Diseño responsivo que se adapta a diferentes tamaños de pantalla y ordenadores.
- **Optimización Móvil**: Controles táctiles mejorados, canvas adaptativo y experiencia optimizada para smartphones y tablets.

## Mejoras Recientes
- ✅ **Compatibilidad mejorada**: Canvas responsivo que se adapta automáticamente al tamaño de la ventana
- ✅ **Escalado inteligente**: Tamaños de fuente y elementos visuales se ajustan según la resolución
- ✅ **Interfaz adaptativa**: Controles y checklist se reubican automáticamente en pantallas pequeñas
- ✅ **Texto de fuerzas optimizado**: Mejor visibilidad del texto "Peso" con alto contraste y escalado responsivo

## Archivos
- `index.html`: Página web principal con CSS para la interfaz.
- `lift_interactive.js`: Código p5.js para la simulación.
- `aerodinamica_base.png`: Imagen de fondo con avión y flujos (debe estar en la carpeta).
- `TODO.md`: Historial de tareas y mejoras.

## Cómo Ejecutar
1. Asegúrate de que `aerodinamica_base.png` esté en la carpeta del proyecto.
2. Abre `index.html` en un navegador web moderno.

## Despliegue en Vercel

### 🚀 Despliegue Automático (Muy Fácil)
1. Ve a [vercel.com](https://vercel.com)
2. Crea una cuenta gratuita
3. Haz clic en **"Import Project"**
4. Conecta tu repositorio GitHub: `Joaquinagm01/FISICA-MODELO`
5. **Vercel detectará automáticamente** que es un proyecto estático
6. ¡Listo! Tu sitio estará online en segundos

### 📁 Archivos Necesarios
Solo necesitas los archivos HTML y JavaScript. **No se requiere configuración especial**.

### 🌐 URLs Disponibles
Después del despliegue, tendrás acceso a:
- `https://tu-proyecto.vercel.app/index.html` - Simulador principal
- `https://tu-proyecto.vercel.app/test_ala_checklist.html` - Versión con checklist
- `https://tu-proyecto.vercel.app/test_ala.html` - Versión básica
- `https://tu-proyecto.vercel.app/` - Redirige automáticamente a index.html

### Opción 3: Script de Despliegue Rápido
```bash
# Hacer el script ejecutable (solo la primera vez)
chmod +x deploy.sh

# Ejecutar el despliegue
./deploy.sh
```

Este script instalará Vercel CLI si es necesario, verificará la autenticación y desplegará automáticamente el proyecto.

### URLs Disponibles
- `https://tu-proyecto.vercel.app/index.html` - Simulador principal
- `https://tu-proyecto.vercel.app/test_ala_checklist.html` - Versión con checklist
- `https://tu-proyecto.vercel.app/test_ala.html` - Versión básica de prueba
3. Usa el deslizador para cambiar el ángulo de ataque y observa los cambios.

## Requisitos
- Navegador web con soporte para p5.js (Chrome, Firefox, etc.).
- Imagen `aerodinamica_base.png` (crea o descarga una imagen de avión con flujos aerodinámicos).