import {Controller, Get} from "@nodeboot/core";

@Controller("/hello")
export class HelloController {
    @Get("/")
    async hello(): Promise<string> {
        return "Hello, from Node-Boot running on Netlify!";
    }

    @Get("/info")
    async info(): Promise<Record<string, any>> {
        return {
            runtime: "netlify",
            context: process.env["CONTEXT"] ?? "local",
            deployId: process.env["DEPLOY_ID"] ?? "local",
        };
    }
}
