import Koa from "koa";
import bodyParser from "koa-bodyparser";
import {AppDataSource} from "./data-source";
import {seedTodos} from "./seed";
import {helloRouter} from "./routes/hello";
import {todosRouter} from "./routes/todos";

const PORT = 4004;

const app = new Koa();

// Centralized error-handling middleware, registered first so it wraps the whole pipeline
// (the standard Koa community pattern, since Koa has no built-in error handler).
app.use(async (ctx, next) => {
    try {
        await next();
    } catch (err) {
        console.error(err);
        ctx.status = 500;
        ctx.body = {error: "Internal server error"};
    }
});

app.use(bodyParser());
app.use(helloRouter.routes()).use(helloRouter.allowedMethods());
app.use(todosRouter.routes()).use(todosRouter.allowedMethods());

AppDataSource.initialize()
    .then(seedTodos)
    .then(() => {
        app.listen(PORT, () => {
            console.log(`[raw-koa] listening on http://localhost:${PORT}`);
        });
    })
    .catch(error => {
        console.error("Error starting raw-koa benchmark app:", error);
        process.exit(1);
    });
