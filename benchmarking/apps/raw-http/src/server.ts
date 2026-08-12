import {createServer, IncomingMessage, ServerResponse} from "node:http";
import {AppDataSource} from "./data-source";
import {seedTodos} from "./seed";
import {Todo} from "./entities/Todo";
import {sendJson, readJsonBody} from "./http-utils";

const PORT = 4001;

const todoRepository = () => AppDataSource.getRepository(Todo);

// Minimal, dependency-free routing: match on method + parsed pathname, the common pattern for
// small services built directly on Node's `http` module without a framework.
async function handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const url = new URL(req.url ?? "/", `http://${req.headers.host}`);
    const {pathname} = url;
    const method = req.method ?? "GET";

    try {
        if (method === "GET" && pathname === "/hello") {
            sendJson(res, 200, {message: "Hello, World!"});
            return;
        }

        if (method === "GET" && pathname === "/todos") {
            const todos = await todoRepository().find({order: {id: "DESC"}, take: 20});
            sendJson(res, 200, todos);
            return;
        }

        const todoIdMatch = pathname.match(/^\/todos\/(\d+)$/);
        if (method === "GET" && todoIdMatch) {
            const todo = await todoRepository().findOneBy({id: Number(todoIdMatch[1])});
            if (!todo) {
                sendJson(res, 404, {error: "Not found"});
                return;
            }
            sendJson(res, 200, todo);
            return;
        }

        if (method === "POST" && pathname === "/todos") {
            const body = await readJsonBody<{title?: string}>(req);
            const todo = todoRepository().create({title: body?.title || "Untitled", done: false});
            sendJson(res, 201, await todoRepository().save(todo));
            return;
        }

        sendJson(res, 404, {error: "Not found"});
    } catch (err) {
        console.error(err);
        sendJson(res, 500, {error: "Internal server error"});
    }
}

const server = createServer((req, res) => {
    handleRequest(req, res).catch(err => {
        console.error(err);
        sendJson(res, 500, {error: "Internal server error"});
    });
});

AppDataSource.initialize()
    .then(seedTodos)
    .then(() => {
        server.listen(PORT, () => {
            console.log(`[raw-http] listening on http://localhost:${PORT}`);
        });
    })
    .catch(error => {
        console.error("Error starting raw-http benchmark app:", error);
        process.exit(1);
    });
