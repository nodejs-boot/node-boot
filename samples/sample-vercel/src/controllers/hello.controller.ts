import {Controller, Get} from "@nodeboot/core";

@Controller("/hello")
export class HelloController {
    @Get("/")
    async hello(): Promise<string> {
        return "Hello, from Node-Boot running on Vercel!";
    }

    @Get("/info")
    async info(): Promise<Record<string, any>> {
        return {
            runtime: "vercel",
            region: process.env["VERCEL_REGION"] ?? "local",
            deploymentUrl: process.env["VERCEL_URL"] ?? "local",
        };
    }
}
