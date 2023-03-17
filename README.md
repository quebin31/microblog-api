# Microblog Service

A simple blogging service written in TypeScript using Express, Prisma (with Postgres) and Redis.
Runtime schema validation is done using Zod which also provides inferred TypeScript types from
schemas.

## Environments

There are three different supported environments: `production`, `development` and `test`.
Each environment uses a `.env` suffixed by the name of the environment, for
example, `.env.environment`.

The configuration of the service is read through environment variables stored in these files,
do not track this into your version control as all the data there is sensitive, take a look at the
[`.env.example`](.env.example) file to see which env variables are required to run the service.

### Development

Podman (or Docker) is required for development to create a local Postgres database and
a local Redis instance, to start these services run the `setup:development` npm script, which also
takes care of applying Prisma migrations.

### Testing

Testing is separated in two Jest projects, one for [unit tests](jest/jest.config.unit.ts) and the
other for [integration tests](jest/jest.config.integration.ts). To create a unit test file the
standard `*.test.ts` naming convention is used, while for integration test files the following
convention `*.itest.ts` is used (`i` for integration). There's no need to run the `setup:test` npm
script manually as it's automatically ran whenever it's needed by one of the `test:*` npm scripts,
note however that you also need Podman (or Docker) to run integrated tests.

_See [docker-compose.dev.yml](docker-compose.dev.yml)
and [docker-compose.test.yml](docker-compose.test.yml)._

### Production

To set up the production environment run the `setup:production` npm script which takes care of
applying migrations to the database and running seeds if necessary, in contrast to the dev and test
environment this setup doesn't take care of create a database or Redis instance as it expects those
services to be already running and be accessible through their respective URL environment variables.

#### Deploying

This is how you will build the service to deploy it in production:

```shell
npm i && npm run build && npm run setup:production
```

And to start it with Node:

```shell
npm start # or node dist/src/index.js
```

## Admins File

In order to seed the database with an initial set of admins the provided Prisma seed script looks
up for a file to be defined in the environment variable `ADMINS_FILE`, to see an example of what
structure is expected see the file [admins.example.json](admins.example.json).

```json
[
    {
        "email": "example1@mail.com",
        "password": "pa$$w0rd",
        "name": "Example 1"
    }
]
```

_Do not push your admins file to your git remote as it contains sensitive data about your admins._

## OpenAPI

All the API endpoints are documented using the OpenAPI specification, with only failure responses
missing, to serve the documentation locally using Redocly run the `redoc:watch` npm script, and if
the service is already running access it by hitting the path `/api/v1/openapi`.
