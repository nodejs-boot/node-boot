import {Controller, Get} from "@nodeboot/core";

@Controller("/hello", "v1")
export class HelloController {
    @Get("/")
    async getUsers(): Promise<string> {
        return "Hello, World!";
    }
}
