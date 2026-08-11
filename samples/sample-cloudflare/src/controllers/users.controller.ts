import {Body, Controller, Delete, Get, HttpCode, Param, Post} from "@nodeboot/core";
import {Authorized} from "@nodeboot/authorization";
import {Inject} from "@nodeboot/di";
import {UserService} from "../services/users.service";
import {CreateUserDto} from "../models/CreateUserDto";
import {UserModel} from "../models/UserModel";

@Controller("/users")
export class UserController {
    @Inject(() => UserService)
    private readonly userService: UserService;

    @Get("/")
    async getUsers(): Promise<UserModel[]> {
        return this.userService.findAll();
    }

    @Get("/:id")
    async getUserById(@Param("id") id: string): Promise<UserModel> {
        return this.userService.findById(id);
    }

    @Post("/")
    @HttpCode(201)
    @Authorized()
    async createUser(@Body() userData: CreateUserDto): Promise<UserModel> {
        return this.userService.create(userData);
    }

    @Delete("/:id")
    async deleteUser(@Param("id") id: string): Promise<{message: string}> {
        this.userService.delete(id);
        return {message: `User ${id} successfully deleted`};
    }
}
