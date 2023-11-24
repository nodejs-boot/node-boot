/**
 * Used to register middlewares.
 * This signature is used for Fastify hooks.
 */
export interface FastifyMiddlewareInterface<
    TRequest = any,
    TReply = any,
    TDone = any,
> {
    /**
     * Called before controller action is being executed.
     * This signature is used for Fastify hooks.
     */
    use(request: TRequest, reply: TReply, done: TDone, payload?: any): any;
}
