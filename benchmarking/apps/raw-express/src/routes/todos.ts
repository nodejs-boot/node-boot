import {Router, Request, Response, NextFunction} from "express";
import {AppDataSource} from "../data-source";
import {Todo} from "../entities/Todo";

// Community-standard Express pattern: a resource-scoped `Router()` mounted in `server.ts`,
// each handler wrapped to forward rejected promises to Express's error-handling middleware.
export const todosRouter = Router();

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
    return (req: Request, res: Response, next: NextFunction) => fn(req, res, next).catch(next);
}

const todoRepository = () => AppDataSource.getRepository(Todo);

todosRouter.get(
    "/",
    asyncHandler(async (_req, res) => {
        const todos = await todoRepository().find({order: {id: "DESC"}, take: 20});
        res.json(todos);
    }),
);

todosRouter.get(
    "/:id",
    asyncHandler(async (req, res) => {
        const todo = await todoRepository().findOneBy({id: Number(req.params.id)});
        if (!todo) {
            res.status(404).json({error: "Not found"});
            return;
        }
        res.json(todo);
    }),
);

todosRouter.post(
    "/",
    asyncHandler(async (req, res) => {
        const todo = todoRepository().create({title: req.body?.title || "Untitled", done: false});
        res.status(201).json(await todoRepository().save(todo));
    }),
);
