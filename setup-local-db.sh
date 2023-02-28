#!/usr/bin/env bash

source .env

# Can be replaced with docker and docker-compose
readonly CONTAINER_EXEC="${RUNNER:-podman}"
readonly CONTAINER_COMPOSE_EXEC="${RUNNER:-podman-compose}"
readonly SERVICE_NAME="microblog-local-db"

## Script code
function exec_in_container() {
    $CONTAINER_EXEC exec -u "${DB_USERNAME}" $SERVICE_NAME bash -c "$*"
}

$CONTAINER_COMPOSE_EXEC down
$CONTAINER_COMPOSE_EXEC up -d

sleep 1
exec_in_container createdb microblog || true
