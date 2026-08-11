import {Controller, Get} from "@nodeboot/core";

@Controller("/hello")
export class HelloController {
    @Get("/")
    async hello(): Promise<string> {
        return "Hello, from Node-Boot running on Cloudflare Workers!";
    }

    @Get("/info")
    async info(): Promise<Record<string, any>> {
        return {
            runtime: "cloudflare-workers",
            colo: (globalThis as any)?.["CF_COLO"] ?? "local",
        };
    }
}
