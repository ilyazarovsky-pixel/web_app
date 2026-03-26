#!/bin/bash

# =============================================================================
# LearnHub Deployment Script
# Использование: ./deploy.sh
# =============================================================================

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Функции для цветного вывода
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# =============================================================================
# Шаг 1: Проверка окружения
# =============================================================================
log_info "Проверка окружения..."

# Проверка наличия .env файла
if [ ! -f .env ]; then
    log_error "Файл .env не найден!"
    log_info "Создайте файл .env на основе .env.example"
    exit 1
fi

# Проверка наличия docker-compose.prod.yml
if [ ! -f docker-compose.prod.yml ]; then
    log_error "Файл docker-compose.prod.yml не найден!"
    exit 1
fi

# Проверка Docker
if ! command -v docker &> /dev/null; then
    log_error "Docker не установлен!"
    exit 1
fi

# Проверка Docker Compose
if ! command -v docker-compose &> /dev/null; then
    log_error "Docker Compose не установлен!"
    exit 1
fi

log_success "Проверка окружения завершена"

# =============================================================================
# Шаг 2: Git pull (обновление кода)
# =============================================================================
log_info "Обновление кода из репозитория..."

git pull origin main

if [ $? -ne 0 ]; then
    log_error "Ошибка при обновлении кода!"
    exit 1
fi

log_success "Код обновлён"

# =============================================================================
# Шаг 3: Сборка образов
# =============================================================================
log_info "Сборка Docker образов..."

docker-compose -f docker-compose.prod.yml build

if [ $? -ne 0 ]; then
    log_error "Ошибка при сборке образов!"
    exit 1
fi

log_success "Образы собраны"

# =============================================================================
# Шаг 4: Остановка старых контейнеров (graceful shutdown)
# =============================================================================
log_info "Остановка старых контейнеров..."

# Graceful shutdown с таймаутом 30 секунд
docker-compose -f docker-compose.prod.yml stop -t 30

if [ $? -ne 0 ]; then
    log_warning "Некоторые контейнеры не остановились корректно"
fi

log_success "Контейнеры остановлены"

# =============================================================================
# Шаг 5: Запуск новых контейнеров
# =============================================================================
log_info "Запуск новых контейнеров..."

docker-compose -f docker-compose.prod.yml up -d

if [ $? -ne 0 ]; then
    log_error "Ошибка при запуске контейнеров!"
    # Откат на предыдущую версию
    log_info "Откат на предыдущую версию..."
    docker-compose -f docker-compose.prod.yml up -d
    exit 1
fi

log_success "Контейнеры запущены"

# =============================================================================
# Шаг 6: Проверка health check
# =============================================================================
log_info "Проверка здоровья сервисов..."

# Ждём пока сервисы запустятся
sleep 10

# Проверка backend
MAX_RETRIES=10
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    HEALTH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health 2>/dev/null)
    
    if [ "$HEALTH_RESPONSE" = "200" ]; then
        log_success "Backend здоров (HTTP $HEALTH_RESPONSE)"
        break
    fi
    
    RETRY_COUNT=$((RETRY_COUNT + 1))
    log_warning "Попытка $RETRY_COUNT/$MAX_RETRIES: Backend ещё не готов (HTTP $HEALTH_RESPONSE)"
    sleep 5
done

if [ "$HEALTH_RESPONSE" != "200" ]; then
    log_error "Backend не прошёл health check после $MAX_RETRIES попыток!"
    
    # Проверка логов
    log_info "Логи backend:"
    docker-compose -f docker-compose.prod.yml logs --tail=50 backend
    
    # Откат
    log_info "Откат на предыдущую версию..."
    docker-compose -f docker-compose.prod.yml down
    docker-compose -f docker-compose.prod.yml up -d
    
    exit 1
fi

# Проверка nginx
NGINX_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/ 2>/dev/null)

if [ "$NGINX_RESPONSE" = "200" ] || [ "$NGINX_RESPONSE" = "304" ]; then
    log_success "Nginx здоров (HTTP $NGINX_RESPONSE)"
else
    log_warning "Nginx вернул HTTP $NGINX_RESPONSE (возможно требуется настройка)"
fi

# Проверка redis
REDIS_PING=$(docker-compose -f docker-compose.prod.yml exec -T redis redis-cli ping 2>/dev/null)

if [ "$REDIS_PING" = "PONG" ]; then
    log_success "Redis здоров"
else
    log_warning "Redis не ответил на ping"
fi

log_success "Все сервисы работают корректно"

# =============================================================================
# Шаг 7: Очистка старых образов
# =============================================================================
log_info "Очистка старых Docker образов..."

docker image prune -f --filter "until=24h"

log_success "Очистка завершена"

# =============================================================================
# Завершение
# =============================================================================
echo ""
log_success "═══════════════════════════════════════════════════"
log_success "  Деплой LearnHub завершён успешно!"
log_success "═══════════════════════════════════════════════════"
echo ""
log_info "Полезные команды:"
log_info "  Просмотр логов:    docker-compose -f docker-compose.prod.yml logs -f"
log_info "  Статус сервисов:   docker-compose -f docker-compose.prod.yml ps"
log_info "  Остановка:         docker-compose -f docker-compose.prod.yml down"
log_info "  Перезапуск:        docker-compose -f docker-compose.prod.yml restart"
echo ""
