import {Controller, Get} from "@nodeboot/core";

@Controller("/hello")
export class HelloController {
    @Get("/")
    async hello(): Promise<string> {
        return "Hello, from Node-Boot running on Encore.ts!";
    }

    @Get("/info")
    async info(): Promise<Record<string, any>> {
        return {
            runtime: "encore.ts",
            environment: process.env["NODE_ENV"] ?? "development",
        };
    }
}
