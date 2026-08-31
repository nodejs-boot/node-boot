import {Body, Controller, CookieParam, Get, HeaderParam, Param, Post, QueryParam} from "@nodeboot/core";
import {CreateItemDto} from "./CreateItemDto";

@Controller("/items")
export class ItemsController {
    /**
     * Regression test target: path params must be resolved from the specific matched route
     * (`/items/:id`), not leaked/cached from an earlier global `@Middleware` layer whose own
     * pattern has no named params.
     */
    @Get("/:id")
    async getById(@Param("id") id: number): Promise<Record<string, any>> {
        return {id, type: typeof id};
    }

    @Get()
    async search(@QueryParam("q") q: string): Promise<Record<string, any>> {
        return {q};
    }

    @Get("/echo/header")
    async echoHeader(@HeaderParam("x-test-header") value: string): Promise<Record<string, any>> {
        return {value};
    }

    @Get("/echo/cookie")
    async echoCookie(@CookieParam("session") session: string): Promise<Record<string, any>> {
        return {session};
    }

    @Post()
    async create(@Body() item: CreateItemDto): Promise<Record<string, any>> {
        return {name: item.name, quantity: item.quantity};
    }
}
