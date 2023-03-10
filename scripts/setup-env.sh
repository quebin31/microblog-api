#!/usr/bin/env bash

# Can be replaced with docker and docker-compose
readonly CONTAINER_EXEC="${RUNNER:-podman}"
readonly CONTAINER_COMPOSE_EXEC="${RUNNER:-podman}-compose"

case "$1" in
"dev" | "development" | "")
    readonly ENV_FILE=.env.development
    readonly DB_SERVICE_NAME="microblog-local-db"
    readonly COMPOSE_FILE="docker-compose.dev.yml"
    ;;
"test")
    readonly ENV_FILE=.env.test
    readonly DB_SERVICE_NAME="microblog-test-db"
    readonly COMPOSE_FILE="docker-compose.test.yml"
    ;;
*)
    echo "Unknown environment $1"
    exit 1
    ;;
esac

if [[ ! -f "${ENV_FILE}" ]]; then
    echo "Couldn't find environment file: ${ENV_FILE}"
    exit 1
else
    set -o allexport
    # shellcheck source=.
    source "${ENV_FILE}"
    set +o allexport
fi

## Script code
"${CONTAINER_COMPOSE_EXEC}" -f "${COMPOSE_FILE}" down
"${CONTAINER_COMPOSE_EXEC}" -f "${COMPOSE_FILE}" up -d
sleep 1
"${CONTAINER_EXEC}" exec -u "${DB_USERNAME}" "${DB_SERVICE_NAME}" bash -c "createdb microblog" || true
