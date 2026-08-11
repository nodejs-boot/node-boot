import {Controller, Get} from "@nodeboot/core";

@Controller("/hello")
export class HelloController {
    @Get("/")
    async hello(): Promise<string> {
        return "Hello, from Node-Boot running on Google Cloud Functions!";
    }

    @Get("/info")
    async info(): Promise<Record<string, any>> {
        return {
            runtime: "google-cloud-functions",
            region: process.env["FUNCTION_REGION"] ?? process.env["FUNCTION_TARGET"] ?? "local",
            service: process.env["K_SERVICE"] ?? "local",
        };
    }
}
