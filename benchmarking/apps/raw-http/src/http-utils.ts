import {IncomingMessage, ServerResponse} from "node:http";

export function sendJson(res: ServerResponse, status: number, payload: unknown): void {
    const body = JSON.stringify(payload);
    res.writeHead(status, {"Content-Type": "application/json; charset=utf-8"});
    res.end(body);
}

export function readJsonBody<T = unknown>(req: IncomingMessage): Promise<T | undefined> {
    return new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];
        req.on("data", chunk => chunks.push(chunk));
        req.on("end", () => {
            if (chunks.length === 0) {
                resolve(undefined);
                return;
            }
            try {
                resolve(JSON.parse(Buffer.concat(chunks).toString("utf-8")));
            } catch {
                reject(new Error("Invalid JSON body"));
            }
        });
        req.on("error", reject);
    });
}
