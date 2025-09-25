import {Controller, Get} from "@nodeboot/core";
import {OpenAPI, ResponseSchema} from "@nodeboot/starter-openapi";
import {SampleModel} from "../models/SampleModel";

@Controller("/hello", "v1")
export class HelloController {
    @Get("/")
    @ResponseSchema("string")
    async hello(): Promise<string> {
        return "Hello, World!";
    }

    @Get()
    @OpenAPI({summary: "Say hello with arbitrary data"})
    @ResponseSchema("object")
    async getHelloProps(): Promise<Record<string, any>> {
        return {
            prop1: "value1",
            prop2: 2,
            prop3: true,
            prop4: {nestedProp: "nestedValue"},
        };
    }

    @Get("/complex")
    @OpenAPI({summary: "Say hello in a complex mode"})
    @ResponseSchema(SampleModel)
    async helloComplex(): Promise<SampleModel> {
        return {} as any;
    }
}
