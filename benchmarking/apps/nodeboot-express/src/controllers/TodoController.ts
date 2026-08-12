import {Body, Controller, Get, Param, Post} from "@nodeboot/core";
import {TodoService} from "../services/TodoService";

@Controller("/todos")
export class TodoController {
    constructor(private readonly todoService: TodoService) {}

    @Get()
    list() {
        return this.todoService.findAll();
    }

    @Get("/:id")
    get(@Param("id") id: string) {
        return this.todoService.findById(Number(id));
    }

    @Post()
    create(@Body() body: {title?: string}) {
        return this.todoService.create(body?.title ?? "Untitled");
    }
}
