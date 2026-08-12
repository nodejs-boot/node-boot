import express, {ErrorRequestHandler} from "express";
import {AppDataSource} from "./data-source";
import {seedTodos} from "./seed";
import {helloRouter} from "./routes/hello";
import {todosRouter} from "./routes/todos";

const PORT = 4002;

const app = express();
app.use(express.json());
app.use("/hello", helloRouter);
app.use("/todos", todosRouter);

// Standard Express 4-arg error-handling middleware, registered last.
const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({error: "Internal server error"});
};
app.use(errorHandler);

AppDataSource.initialize()
    .then(seedTodos)
    .then(() => {
        app.listen(PORT, () => {
            console.log(`[raw-express] listening on http://localhost:${PORT}`);
        });
    })
    .catch(error => {
        console.error("Error starting raw-express benchmark app:", error);
        process.exit(1);
    });
