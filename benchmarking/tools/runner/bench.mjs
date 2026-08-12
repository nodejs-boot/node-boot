#!/usr/bin/env node
// Small autocannon-based CLI: hits a given URL and writes a normalized JSON result file so the
// report aggregator can later compare req/sec, latency, and throughput across every app/endpoint
// combination benchmarked (raw-* vs nodeboot-*, per HTTP server, per endpoint).
import autocannon from "autocannon";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RESULTS_DIR = path.join(__dirname, "..", "..", "results");

function parseArgs(argv) {
    const args = {duration: 10, connections: 50, method: "GET", body: undefined};
    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        if (arg === "--url") args.url = argv[++i];
        else if (arg === "--app") args.app = argv[++i];
        else if (arg === "--endpoint") args.endpoint = argv[++i];
        else if (arg === "--duration") args.duration = Number(argv[++i]);
        else if (arg === "--connections") args.connections = Number(argv[++i]);
        else if (arg === "--method") args.method = argv[++i];
        else if (arg === "--body") args.body = argv[++i];
    }
    return args;
}

async function main() {
    const {url, app, endpoint, duration, connections, method, body} = parseArgs(process.argv.slice(2));

    if (!url || !app || !endpoint) {
        console.error(
            "Usage: bench --url <url> --app <name> --endpoint <label> [--duration 10] [--connections 50] [--method GET] [--body '{}']",
        );
        process.exit(1);
    }

    console.log(`Benchmarking ${app} ${endpoint} -> ${url} (${connections} connections, ${duration}s)`);

    const result = await autocannon({
        url,
        connections,
        duration,
        method,
        headers: body ? {"content-type": "application/json"} : undefined,
        body,
    });

    fs.mkdirSync(RESULTS_DIR, {recursive: true});
    const outFile = path.join(RESULTS_DIR, `${app}__${endpoint}.json`);
    fs.writeFileSync(
        outFile,
        JSON.stringify(
            {
                app,
                endpoint,
                url,
                method,
                body,
                connections,
                duration,
                requestsPerSec: result.requests.average,
                latencyMs: {
                    p50: result.latency.p50,
                    p99: result.latency.p99,
                    avg: result.latency.average,
                },
                throughputBytesPerSec: result.throughput.average,
                errors: result.errors,
                timeouts: result.timeouts,
                non2xx: result.non2xx,
            },
            null,
            2,
        ),
    );
    console.log(`Wrote ${outFile}`);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
