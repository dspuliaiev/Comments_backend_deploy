# Stage 1: Builder
FROM python:3.12-bullseye AS builder

# Устанавливаем переменные окружения для Python
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Обновляем пакеты и устанавливаем зависимости для сборки
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential libpq-dev zlib1g-dev \
    && rm -rf /var/lib/apt/lists/*

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем requirements.txt
COPY requirements.txt /app/

# Обновляем pip и устанавливаем зависимости
RUN pip install --upgrade pip --no-cache-dir && pip install -r requirements.txt

# Копируем оставшиеся файлы проекта
COPY . /app/

# Собираем статику
RUN python manage.py collectstatic --noinput

# Stage 2: Final
FROM python:3.12-bullseye

# Устанавливаем переменные окружения для Python
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Обновляем пакеты и устанавливаем runtime зависимости
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev zlib1g \
    && rm -rf /var/lib/apt/lists/*

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем зависимости из builder
COPY --from=builder /usr/local /usr/local

# Копируем статические файлы из builder
COPY --from=builder /app/staticfiles /app/staticfiles

# Копируем оставшиеся файлы проекта
COPY . /app/

# Команда для запуска Daphne
CMD ["daphne", "-b", "0.0.0.0", "-p", "8000", "backend.asgi:application"]

