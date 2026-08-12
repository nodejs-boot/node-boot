import Router from "@koa/router";

// Idiomatic Koa pattern: a router instance per resource, each owning its own URL prefix.
export const helloRouter = new Router({prefix: "/hello"});

helloRouter.get("/", ctx => {
    ctx.body = {message: "Hello, World!"};
});
