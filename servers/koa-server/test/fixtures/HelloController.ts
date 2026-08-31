import {Controller, Get, HttpCode, Redirect} from "@nodeboot/core";

@Controller("/hello")
export class HelloController {
    @Get("/")
    async plain(): Promise<string> {
        return "Hello, World!";
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
