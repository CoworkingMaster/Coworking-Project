#!/bin/sh

echo "Waiting for database..."

while ! nc -z db 3306; do
  sleep 1
done

echo "Database ready"

echo "Running migrations..."
python manage.py migrate

echo "Seeding spaces..."
python manage.py seed_spaces

# Crear superuser automático si no existe
if [ "$DJANGO_SUPERUSER_EMAIL" ]; then
  echo "Creating superuser..."
  python manage.py createsuperuser \
    --noinput \
    --email $DJANGO_SUPERUSER_EMAIL \
    || true
fi

echo "Starting Django server..."

python manage.py runserver 0.0.0.0:8000