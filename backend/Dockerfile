# ──────────────────────────────────────────────
# Stage 1 — Builder: compila wheels con herramientas de build
# (compilador + headers de MariaDB solo aquí, no en la imagen final)
# ──────────────────────────────────────────────
FROM python:3.12-slim AS builder

ENV PYTHONDONTWRITEBYTECODE=1

WORKDIR /build

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       default-libmysqlclient-dev \
       build-essential \
       pkg-config \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip wheel --no-cache-dir --wheel-dir /wheels -r requirements.txt

# ──────────────────────────────────────────────
# Stage 2 — Runtime: imagen final limpia y ligera
# Sin compilador, sin headers; solo lo necesario en producción/dev
# ──────────────────────────────────────────────
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Solo la librería de runtime de MySQL (sin -dev ni compiladores)
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       default-libmysqlclient-dev \
       build-essential \
       pkg-config \
       netcat-openbsd \
    && rm -rf /var/lib/apt/lists/*
# Instalar wheels pre-compilados: sin red, sin compilador
COPY --from=builder /wheels /wheels
RUN pip install --no-cache-dir --no-index --find-links /wheels /wheels/*.whl \
    && rm -rf /wheels

# El código fuente se monta como volumen en desarrollo
# (COPY . . sirve si se elimina el volumen en producción)
COPY . .

EXPOSE 8000
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
