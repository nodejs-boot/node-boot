import {FastifyPluginAsync} from "fastify";
import {Todo} from "../entities/Todo";

const SEED_ROWS = 1000;

const helloRoute: FastifyPluginAsync = async fastify => {
    fastify.get("/hello", async () => ({message: "Hello, World!"}));
};

const todosRoute: FastifyPluginAsync = async fastify => {
    const repo = () => fastify.orm.getRepository(Todo);

    fastify.addHook("onReady", async () => {
        const existing = await repo().count();
        if (existing > 0) return;
        const seed: Partial<Todo>[] = Array.from({length: SEED_ROWS}, (_, i) => ({
            title: `Benchmark todo #${i + 1}`,
            done: (i + 1) % 5 === 0,
        }));
        await repo().save(seed);
    });

    fastify.get("/todos", async () => repo().find({order: {id: "DESC"}, take: 20}));

    fastify.get<{Params: {id: string}}>("/todos/:id", async (request, reply) => {
        const todo = await repo().findOneBy({id: Number(request.params.id)});
        if (!todo) {
            return reply.status(404).send({error: "Not found"});
        }
        return todo;
    });

    fastify.post<{Body: {title?: string}}>("/todos", async (request, reply) => {
        const todo = repo().create({title: request.body?.title || "Untitled", done: false});
        reply.status(201);
        return repo().save(todo);
    });
};

export {helloRoute, todosRoute};
