import Router from "@koa/router";
import {AppDataSource} from "../data-source";
import {Todo} from "../entities/Todo";

export const todosRouter = new Router({prefix: "/todos"});
const todoRepository = () => AppDataSource.getRepository(Todo);

todosRouter.get("/", async ctx => {
    ctx.body = await todoRepository().find({order: {id: "DESC"}, take: 20});
});

todosRouter.get("/:id", async ctx => {
    const todo = await todoRepository().findOneBy({id: Number(ctx.params.id)});
    if (!todo) {
        ctx.status = 404;
        ctx.body = {error: "Not found"};
        return;
    }
    ctx.body = todo;
});

todosRouter.post("/", async ctx => {
    const body = ctx.request.body as {title?: string} | undefined;
    const todo = todoRepository().create({title: body?.title || "Untitled", done: false});
    ctx.status = 201;
    ctx.body = await todoRepository().save(todo);
});
