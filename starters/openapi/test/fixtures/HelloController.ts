import {Controller, Get, Param} from "@nodeboot/core";

@Controller("/hello")
export class HelloController {
    @Get("/:id")
    getHello(@Param("id") id: string): {id: string} {
        return {id};
    }
}
