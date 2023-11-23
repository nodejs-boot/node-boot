/**
 * n Node.js, uncaught errors are likely to cause memory leaks, file descriptor leaks, and other major production issues.
 * Domains were a failed attempt to fix this.
 *
 * Given that it is not possible to process all uncaught errors sensibly, the best way to deal with them is to crash.
 */
export interface FastifyErrorHandlerInterface<
  TRequest = any,
  TReply = any,
  TError = any
> {
  error(request: TRequest, reply: TReply, error: TError): any;
}
