#!/usr/bin/env bash

source .env

# Can be replaced with docker and docker-compose
readonly CONTAINER_EXEC="${RUNNER:-podman}"
readonly CONTAINER_COMPOSE_EXEC="${RUNNER:-podman}-compose"
readonly DB_SERVICE_NAME="microblog-local-db"

## Script code
$CONTAINER_COMPOSE_EXEC -f docker-compose.dev.yml down
$CONTAINER_COMPOSE_EXEC -f docker-compose.dev.yml up -d
sleep 1
$CONTAINER_EXEC exec -u "${DB_USERNAME}" $DB_SERVICE_NAME bash -c "createdb microblog" || true
