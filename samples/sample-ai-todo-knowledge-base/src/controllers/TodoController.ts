import {Body, Controller, Delete, Get, HttpCode, Param, Post, Put, QueryParam} from "@nodeboot/core";
import {OpenAPI, ResponseSchema} from "@nodeboot/starter-openapi";
import {TodoService} from "../services/TodoService";
import {CreateTodoDto, UpdateTodoDto} from "../models";
import {Todo} from "../persistence";

@Controller("/todos", "v1")
export class TodoController {
    constructor(private readonly todoService: TodoService) {}

    @Get("/")
    @OpenAPI({summary: "List todos, optionally filtering to only pending ones"})
    @ResponseSchema(Todo, {isArray: true})
    async listTodos(@QueryParam("onlyPending") onlyPending?: boolean): Promise<Todo[]> {
        return this.todoService.list(onlyPending);
    }

    @Get("/search")
    @OpenAPI({summary: "Search todos by free-text query across title, description and tags"})
    @ResponseSchema(Todo, {isArray: true})
    async searchTodos(@QueryParam("query") query: string): Promise<Todo[]> {
        return this.todoService.search(query);
    }

    @Get("/:id")
    @OpenAPI({summary: "Get a single todo by id"})
    @ResponseSchema(Todo)
    async getTodo(@Param("id") id: number): Promise<Todo> {
        return this.todoService.findById(id);
    }

    @Post("/")
    @HttpCode(201)
    @OpenAPI({summary: "Create a new todo"})
    @ResponseSchema(Todo)
    async createTodo(@Body() body: CreateTodoDto): Promise<Todo> {
        return this.todoService.create(body);
    }

    @Put("/:id")
    @OpenAPI({summary: "Update a todo"})
    @ResponseSchema(Todo)
    async updateTodo(@Param("id") id: number, @Body() body: UpdateTodoDto): Promise<Todo> {
        return this.todoService.update(id, body);
    }

    @Post("/:id/complete")
    @OpenAPI({summary: "Mark a todo as completed"})
    @ResponseSchema(Todo)
    async completeTodo(@Param("id") id: number): Promise<Todo> {
        return this.todoService.complete(id);
    }

    @Delete("/:id")
    @OpenAPI({summary: "Delete a todo"})
    async deleteTodo(@Param("id") id: number) {
        await this.todoService.delete(id);
        return {message: `Todo ${id} successfully deleted`};
    }
}
