# Sistema de Autenticación y Roles - Maquillarte

## 🎉 ¡Implementación Completa!

Se ha implementado exitosamente un sistema completo de autenticación y control de acceso basado en roles para tu aplicación Maquillarte.

## 📋 Componentes Creados

### 1. **Auth.jsx** - Componente de Autenticación
- Pantalla de login/registro
- Formulario con validación
- Selección de rol al registrarse
- Diseño responsive y estético

### 2. **authService.js** - Servicio de Autenticación
- `registerUser()` - Registrar nuevos usuarios
- `loginUser()` - Iniciar sesión
- `logoutUser()` - Cerrar sesión
- `getUserRole()` - Obtener rol del usuario
- `onAuthChange()` - Observador de cambios de autenticación
- `hasRole()` / `hasAnyRole()` - Verificar permisos

### 3. **UserProfile.jsx** - Perfil de Usuario
- Muestra información del usuario actual
- Muestra el rol asignado
- Botón para cerrar sesión

### 4. **UserManagement.jsx** - Gestión de Usuarios (Admin)
- Lista todos los usuarios registrados
- Cambiar roles de usuarios
- Eliminar usuarios
- Vista exclusiva para administradores

## 🔐 Roles Implementados

### 👑 Admin (Administrador)
```
✅ Ver inventario
✅ Agregar productos
✅ Editar productos
✅ Eliminar productos
✅ Usar escáner
✅ Gestionar usuarios
```

### 👔 Employee (Empleado)
```
✅ Ver inventario
✅ Agregar productos
✅ Editar productos
❌ Eliminar productos
✅ Usar escáner
❌ Gestionar usuarios
```

### 👤 User (Usuario)
```
✅ Ver inventario
❌ Agregar productos
❌ Editar productos
❌ Eliminar productos
❌ Usar escáner
❌ Gestionar usuarios
```

## 🚀 Cómo Usar

### Paso 1: Configurar Reglas de Seguridad en Firebase
1. Lee el archivo `FIREBASE_SECURITY_RULES.md`
2. Copia las reglas de seguridad
3. Ve a Firebase Console > Firestore > Reglas
4. Pega y publica las reglas

### Paso 2: Habilitar Authentication
1. Ve a Firebase Console > Authentication
2. Habilita "Correo electrónico/Contraseña"
3. Guarda los cambios

### Paso 3: Ejecutar la Aplicación
```bash
npm run dev
```

### Paso 4: Crear tu Primer Usuario
1. La aplicación te llevará automáticamente a la pantalla de login
2. Haz clic en "Regístrate"
3. Ingresa tu correo y contraseña
4. Selecciona el rol (para el primer usuario, elige "Admin")
5. Haz clic en "Registrarse"

### Paso 5: Cambiar Roles (Opcional)
Si necesitas cambiar el rol de un usuario:
1. Ve a Firebase Console > Firestore
2. Busca la colección `users`
3. Encuentra el usuario y edita el campo `role`
4. El usuario debe cerrar sesión y volver a iniciar para que los cambios surtan efecto

## 📱 Funcionalidades por Vista

### Home (Inicio)
- Bienvenida
- Información sobre permisos del usuario actual
- Lista de accesos disponibles según el rol

### Inventario
- **Todos**: Pueden ver la lista de productos
- **Empleados y Admins**: Pueden agregar y editar productos
- **Solo Admins**: Pueden eliminar productos
- Muestra indicador visual de permisos

### Escáner
- **Solo Empleados y Admins**: Acceso completo
- **Usuarios**: Mensaje de acceso denegado

### Gestión de Usuarios
- **Solo Admins**: Acceso completo
- Cambiar roles de usuarios
- Eliminar usuarios
- Ver información de todos los usuarios registrados

## 🔒 Seguridad

### Nivel 1: Interfaz (UI)
- El sidebar oculta opciones según el rol
- Los botones se deshabilitan según permisos
- Mensajes de "Acceso Denegado" cuando corresponde

### Nivel 2: Lógica de Aplicación
- Verificación de roles antes de ejecutar acciones
- Mensajes de alerta si no hay permisos
- Control de acceso en cada función

### Nivel 3: Base de Datos (Firestore)
- Reglas de seguridad en el servidor
- Validación de permisos en cada operación
- Protección contra acceso no autorizado desde consola o API

## 📝 Estructura de Datos

### Colección `users`
```javascript
{
  uid: "user123",
  email: "usuario@ejemplo.com",
  role: "admin", // "admin", "employee", o "user"
  createdAt: "2025-12-03T..."
}
```

### Colección `inventario`
```javascript
{
  id: "12345",
  nombre: "Labial Rojo",
  stock: 50,
  precioUnitario: 15.99
}
```

## 🎨 Características del Diseño

- ✅ Responsive (se adapta a móviles y tablets)
- ✅ Sidebar colapsable con iconos
- ✅ Tema consistente con colores rosados (#FFB6C1)
- ✅ Indicadores visuales de permisos
- ✅ Iconos intuitivos para cada función
- ✅ Formularios con validación
- ✅ Mensajes de error y confirmación

## 🐛 Solución de Problemas

### Error: "No se puede iniciar sesión"
- Verifica que Firebase Authentication esté habilitado
- Asegúrate de usar un correo válido
- La contraseña debe tener al menos 6 caracteres

### Error: "No se pueden guardar datos"
- Verifica que las reglas de Firestore estén publicadas
- Asegúrate de estar autenticado
- Revisa que tu rol tenga permisos para la acción

### Error: "No aparece la opción de gestión de usuarios"
- Solo los administradores pueden ver esta opción
- Verifica tu rol en Firestore
- Cierra sesión y vuelve a iniciar

### Los cambios de rol no se reflejan
- Cierra sesión y vuelve a iniciar
- Limpia el caché del navegador
- Verifica que el rol se haya actualizado en Firestore

## 📚 Próximos Pasos Sugeridos

1. **Recuperación de contraseña**: Implementar "Olvidé mi contraseña"
2. **Perfil de usuario**: Permitir editar información personal
3. **Logs de actividad**: Registrar acciones importantes
4. **Notificaciones**: Alertas para cambios importantes
5. **Exportar datos**: Función para exportar inventario a Excel/PDF
6. **Búsqueda avanzada**: Filtros y búsqueda en el inventario
7. **Estadísticas**: Dashboard con métricas y gráficos

## 🎯 Resumen

Tu aplicación ahora tiene:
- ✅ Sistema de autenticación completo
- ✅ Control de acceso basado en roles
- ✅ Gestión de usuarios para admins
- ✅ Seguridad en múltiples niveles
- ✅ Interfaz adaptada según permisos
- ✅ Diseño responsive y profesional

¡Todo listo para usar! 🚀
