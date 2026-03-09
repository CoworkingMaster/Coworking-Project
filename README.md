# WorkHub 3D — Coworking Management

Aplicación web full-stack para gestión de un coworking con vista 3D interactiva.

## Arquitectura

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Frontend   │────▶│  Backend    │────▶│   MySQL     │
│  React+Vite │     │  Django API │     │   8.0       │
│  :5173      │     │  :8000      │     │   :3306     │
└─────────────┘     └─────────────┘     └─────────────┘
```

## Tecnologías

| Capa       | Stack                                        |
|------------|----------------------------------------------|
| Frontend   | React 19, Vite, Three.js, React Three Fiber   |
| Backend    | Django 4.2, Django REST Framework, CORS       |
| Base datos | MySQL 8.0                                     |
| DevOps     | Docker, Docker Compose                        |

---

## Inicio rápido con Docker (recomendado)

### Prerrequisitos
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) instalado y **en ejecución**

### Pasos

1. **Clonar el repositorio:**
   ```bash
   git clone https://github.com/TrabajoMaster/Coworking.git
   cd Coworking
   ```

2. **Crear el archivo `.env`** a partir de la plantilla:
   ```bash
   cp .env.example .env
   ```
   Edita `.env` y establece contraseñas seguras.

3. **Levantar los 3 contenedores:**
   ```bash
   docker compose up --build
   ```

4. **Acceder a los servicios:**
   - Frontend: [http://localhost:5173](http://localhost:5173)
   - Backend API: [http://localhost:8000](http://localhost:8000)
   - Health check: [http://localhost:8000/api/health/](http://localhost:8000/api/health/)
   - Admin Django: [http://localhost:8000/admin/](http://localhost:8000/admin/)

5. **Ejecutar migraciones de Django** (primera vez):
   ```bash
   docker compose exec backend python manage.py migrate
   ```

6. **Crear superusuario** (opcional):
   ```bash
   docker compose exec backend python manage.py createsuperuser
   ```

### Comandos útiles

```bash
# Parar todos los contenedores
docker compose down

# Parar y eliminar volúmenes (resetear BD)
docker compose down -v

# Ver logs de un servicio
docker compose logs -f backend

# Ejecutar comando en un contenedor
docker compose exec backend python manage.py makemigrations
```

---

## Desarrollo local (sin Docker)

### Prerrequisitos
- Node.js ≥ 18
- Python ≥ 3.10
- (Opcional) MySQL 8.0 — sin él, Django usa SQLite automáticamente

### Backend

```bash
cd backend
python -m venv venv

# Windows
.\venv\Scripts\Activate.ps1
# Linux/Mac
source venv/bin/activate

pip install -r requirements.txt
python manage.py migrate
python manage.py runserver 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

---

## Estructura del proyecto

```
├── docker-compose.yml      # Orquestación de los 3 servicios
├── .env.example            # Plantilla de variables de entorno
├── .gitignore
├── backend/
│   ├── Dockerfile          # Imagen Python 3.11 + Django
│   ├── requirements.txt    # Dependencias Python
│   ├── manage.py
│   └── workhub/            # Proyecto Django
│       ├── settings.py     # Configuración (MySQL / SQLite auto)
│       ├── urls.py         # Rutas API
│       ├── wsgi.py
│       └── asgi.py
├── frontend/
│   ├── Dockerfile          # Imagen Node 20 + Vite
│   ├── package.json
│   ├── vite.config.js      # Proxy /api → backend, host 0.0.0.0
│   └── src/                # Código React
└── db/
    └── init.sql            # Script de inicialización MySQL
```

---

## Variables de entorno

| Variable              | Descripción                       | Ejemplo           |
|-----------------------|-----------------------------------|--------------------|
| `MYSQL_ROOT_PASSWORD` | Contraseña root de MySQL          | `rootpass123`      |
| `MYSQL_DATABASE`      | Nombre de la BD                   | `workhub_db`       |
| `MYSQL_USER`          | Usuario de la aplicación          | `workhub_user`     |
| `MYSQL_PASSWORD`      | Contraseña del usuario            | `workhub_pass123`  |
| `DJANGO_SECRET_KEY`   | Clave secreta de Django           | `change-me-...`    |
| `DJANGO_DEBUG`        | Modo debug (`True`/`False`)       | `True`             |
