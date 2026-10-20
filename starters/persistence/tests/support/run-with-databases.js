#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Runs the given command (the test runner) with the PostgreSQL and MongoDB containers from
 * `tests/docker-compose.yaml` available:
 *
 * - both databases already reachable -> run as-is, leave them alone
 * - otherwise, Docker available      -> start the stack, run, then tear down what was started
 * - otherwise                        -> warn and run anyway (database-backed tests will fail)
 *
 * Set NODEBOOT_TEST_DB_BOOTSTRAP=false to skip all of this.
 *
 * Usage: node tests/support/run-with-databases.js <command> [args...]
 */
const net = require("node:net");
const path = require("node:path");
const {spawn, spawnSync} = require("node:child_process");

const COMPOSE_FILE = path.join(__dirname, "..", "docker-compose.yaml");
const ENDPOINTS = [
    {name: "PostgreSQL", host: "127.0.0.1", port: Number(process.env.DB_PORT || 5435)},
    {name: "MongoDB", host: "127.0.0.1", port: 27017},
];

function isReachable({host, port}) {
    return new Promise(resolve => {
        const socket = net.connect({host, port});
        const done = result => {
            socket.destroy();
            resolve(result);
        };
        socket.setTimeout(1000, () => done(false));
        socket.once("connect", () => done(true));
        socket.once("error", () => done(false));
    });
}

function compose(args) {
    return spawnSync("docker", ["compose", "-f", COMPOSE_FILE, ...args], {stdio: "inherit"});
}

function dockerAvailable() {
    return spawnSync("docker", ["info"], {stdio: "ignore"}).status === 0;
}

async function ensureDatabases() {
    if (process.env.NODEBOOT_TEST_DB_BOOTSTRAP === "false") return false;

    const reachable = await Promise.all(ENDPOINTS.map(isReachable));
    if (reachable.every(Boolean)) {
        console.log("[test-db] PostgreSQL and MongoDB already running, using them.");
        return false;
    }
    if (!dockerAvailable()) {
        console.warn("[test-db] Docker is not available: database-backed tests will fail.");
        return false;
    }

    console.log("[test-db] Starting PostgreSQL and MongoDB via docker compose...");
    const result = compose(["up", "-d", "--wait"]);
    if (result.status !== 0) {
        console.warn("[test-db] docker compose up failed: database-backed tests will fail.");
        compose(["down", "-v"]);
        return false;
    }
    return true;
}

async function main() {
    const [command, ...args] = process.argv.slice(2);
    if (!command) {
        console.error("Usage: run-with-databases.js <command> [args...]");
        process.exit(2);
    }

    const startedByUs = await ensureDatabases();
    let tornDown = false;
    const teardown = () => {
        if (!startedByUs || tornDown) return;
        tornDown = true;
        console.log("[test-db] Stopping the databases started for this run...");
        compose(["down", "-v"]);
    };

    const child = spawn(command, args, {stdio: "inherit"});
    for (const signal of ["SIGINT", "SIGTERM"]) {
        process.on(signal, () => child.kill(signal));
    }
    child.on("exit", (code, signal) => {
        teardown();
        process.exit(code ?? (signal ? 1 : 0));
    });
}

main().catch(error => {
    console.error(error);
    process.exit(1);
});
