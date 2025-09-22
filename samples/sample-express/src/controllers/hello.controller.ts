import {Controller, Get} from "@nodeboot/core";
import {OpenAPI, ResponseSchema} from "@nodeboot/starter-openapi";

@Controller("/hello", "v1")
export class HelloController {
    @Get("/")
    @ResponseSchema("string")
    async hello(): Promise<string> {
        return "Hello, World!";
    }

    @Get()
    @OpenAPI({summary: "Get latest facts by providers"})
    @ResponseSchema("object")
    async getHelloProps(): Promise<Record<string, any>> {
        return {
            prop1: "value1",
            prop2: 2,
            prop3: true,
            prop4: {nestedProp: "nestedValue"},
        };
    }
}
