#!/usr/bin/env bash
# Creates one database per benchmark app on first container boot, so raw-* and nodeboot-*
# apps never share data even though they all talk to the same Postgres instance/port.
set -euo pipefail

DATABASES=(
    raw_http
    raw_express
    raw_fastify
    raw_koa
    nodeboot_http
    nodeboot_express
    nodeboot_fastify
    nodeboot_koa
)

for db in "${DATABASES[@]}"; do
    psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" <<-EOSQL
	CREATE DATABASE $db;
	EOSQL
done
