import {Body, Controller, Delete, Get, HttpCode, Param, Post} from "@nodeboot/core";
import {Authorized} from "@nodeboot/authorization";
import {Inject} from "@nodeboot/di";
import {UserService} from "../services/users.service";
import {CreateUserDto} from "../models/CreateUserDto";
import {UserModel} from "../models/UserModel";

@Controller("/users")
export class UserController {
    // Encore.ts bundles with esbuild, which doesn't emit `design:paramtypes` metadata for
    // `emitDecoratorMetadata`. Without that metadata, typedi cannot determine constructor arity
    // and constructor injection silently breaks (it ends up passing the DI container itself as
    // the argument instead of the resolved dependency). Property injection doesn't rely on that
    // metadata, so it's used here instead.
    @Inject(() => UserService)
    private userService: UserService;

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
    // Encore.ts bundles with esbuild, which doesn't emit `design:paramtypes` metadata for
    // `emitDecoratorMetadata`. Node-Boot normally infers the parameter's class from that metadata
    // to run class-transformer/class-validator against it, so an explicit `type` is passed here
    // instead to make sure the payload is still validated as a `CreateUserDto`.
    async createUser(@Body({type: CreateUserDto}) userData: CreateUserDto): Promise<UserModel> {
        return this.userService.create(userData);
    }

    @Delete("/:id")
    async deleteUser(@Param("id") id: string): Promise<{message: string}> {
        this.userService.delete(id);
        return {message: `User ${id} successfully deleted`};
    }
}
