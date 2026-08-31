import {Controller, Get} from "@nodeboot/core";
import {BadRequestError} from "@nodeboot/error";

@Controller("/errors")
export class ErrorsController {
    @Get("/bad-request")
    async badRequest(): Promise<never> {
        throw new BadRequestError("custom bad request");
    }

    @Get("/boom")
    async boom(): Promise<never> {
        throw new Error("boom");
    }
}
