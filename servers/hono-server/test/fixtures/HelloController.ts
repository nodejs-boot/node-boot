import {Controller, Get, HttpCode, Redirect} from "@nodeboot/core";

/**
 * `@Get("/")` and `@Get()` intentionally share the same base path but must stay distinct routes:
 * Hono is strict about trailing slashes (unlike Express/Koa), so this is a regression test for that.
 */
@Controller("/hello")
export class HelloController {
    @Get("/")
    async plain(): Promise<string> {
        return "Hello, World!";
    }

    @Get()
    async withoutTrailingSlash(): Promise<Record<string, any>> {
        return {message: "hello props"};
    }

    @Get("/created")
    @HttpCode(201)
    async created(): Promise<Record<string, any>> {
        return {created: true};
    }

    @Get("/nothing")
    async nothing(): Promise<null> {
        return null;
    }

    @Get("/missing")
    async missing(): Promise<undefined> {
        return undefined;
    }

    @Get("/redirect")
    @Redirect("/hello/")
    async redirect(): Promise<void> {
        return;
    }
}
