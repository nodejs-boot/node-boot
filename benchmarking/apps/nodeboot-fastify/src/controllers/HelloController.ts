import {Controller, Get} from "@nodeboot/core";

@Controller("/hello")
export class HelloController {
    @Get()
    hello() {
        return {message: "Hello, World!"};
    }
}
