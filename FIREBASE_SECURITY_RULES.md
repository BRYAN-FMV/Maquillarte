# Reglas de Seguridad de Firebase

## Configuración de Firestore Security Rules

Para implementar correctamente el sistema de roles, debes configurar las reglas de seguridad en Firestore. Sigue estos pasos:

### 1. Accede a Firebase Console
1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Selecciona tu proyecto "Maquillarte"
3. En el menú lateral, haz clic en **Firestore Database**
4. Ve a la pestaña **Reglas**

### 2. Actualiza las Reglas de Seguridad

Reemplaza las reglas existentes con las siguientes:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Función auxiliar para obtener el rol del usuario
    function getUserRole() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role;
    }
    
    // Función para verificar si el usuario está autenticado
    function isSignedIn() {
      return request.auth != null;
    }
    
    // Función para verificar si el usuario es administrador
    function isAdmin() {
      return isSignedIn() && getUserRole() == 'admin';
    }
    
    // Función para verificar si el usuario es empleado o admin
    function isEmployeeOrAdmin() {
      return isSignedIn() && (getUserRole() == 'admin' || getUserRole() == 'employee');
    }
    
    // Reglas para la colección de usuarios
    match /users/{userId} {
      // Los usuarios pueden leer su propia información
      allow read: if isSignedIn() && request.auth.uid == userId;
      
      // Solo los usuarios pueden crear su propio documento al registrarse
      allow create: if isSignedIn() && request.auth.uid == userId;
      
      // Los admins pueden leer y modificar cualquier usuario
      allow read, write: if isAdmin();
    }
    
    // Reglas para la colección de inventario
    match /inventario/{itemId} {
      // Todos los usuarios autenticados pueden leer el inventario
      allow read: if isSignedIn();
      
      // Solo empleados y admins pueden crear y actualizar productos
      allow create, update: if isEmployeeOrAdmin();
      
      // Solo los admins pueden eliminar productos
      allow delete: if isAdmin();
    }
    
    // Bloquear acceso a cualquier otra colección
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

### 3. Publica las Reglas
1. Haz clic en el botón **Publicar** para aplicar las nuevas reglas
2. Confirma que las reglas se han publicado correctamente

### 4. Habilitar Firebase Authentication
1. En el menú lateral, haz clic en **Authentication**
2. Ve a la pestaña **Método de inicio de sesión**
3. Habilita **Correo electrónico/Contraseña**
4. Guarda los cambios

## Estructura de Roles

El sistema implementa tres roles:

### 👑 Admin (Administrador)
- ✅ Acceso completo al inventario
- ✅ Puede agregar, editar y eliminar productos
- ✅ Puede usar el escáner de códigos
- ✅ Gestión completa del sistema

### 👔 Employee (Empleado)
- ✅ Acceso al inventario
- ✅ Puede agregar y editar productos
- ✅ Puede usar el escáner de códigos
- ❌ No puede eliminar productos

### 👤 User (Usuario)
- ✅ Acceso de solo lectura al inventario
- ❌ No puede agregar, editar ni eliminar productos
- ❌ No tiene acceso al escáner

## Cómo Funciona

1. **Registro**: Al registrarse, cada usuario se asigna a un rol (por defecto: `user`)
2. **Autenticación**: Al iniciar sesión, el sistema obtiene el rol del usuario desde Firestore
3. **Control de Acceso**: La interfaz muestra/oculta opciones según el rol
4. **Seguridad**: Las reglas de Firestore validan los permisos en el servidor

## Crear el Primer Usuario Admin

Para crear tu primer usuario administrador:

1. Regístrate en la aplicación con cualquier rol
2. Ve a Firebase Console > Firestore Database
3. Busca la colección `users` y encuentra tu usuario
4. Edita el campo `role` y cámbialo a `admin`
5. Cierra sesión y vuelve a iniciar sesión para que los cambios surtan efecto

## Notas Importantes

⚠️ **Seguridad**: Las reglas de Firestore son cruciales para la seguridad de tu aplicación. Asegúrate de publicarlas correctamente.

⚠️ **Roles**: Los roles se almacenan en Firestore, no en Firebase Authentication. Esto te da más flexibilidad para gestionar permisos.

⚠️ **Validación**: Aunque la interfaz oculta opciones según el rol, las reglas de Firestore son la verdadera capa de seguridad que impide acciones no autorizadas.
