import {Body, Controller, Delete, Get, HttpCode, Param, Post, Put} from "@nodeboot/core";
import {UserService} from "../services/users.service";
import {CreateUserDto, UpdateUserDto, UserModel} from "../models";
import {Logger} from "winston";
import {OpenAPI, ResponseSchema} from "@nodeboot/starter-openapi";
import {Authorized} from "@nodeboot/authorization";

@Controller("/users", "v1")
export class UserController {
    constructor(private readonly userService: UserService, private readonly logger: Logger) {}

    @Get("/")
    @ResponseSchema(UserModel, {isArray: true, description: "Return a list of users"})
    @Authorized()
    async getUsers(): Promise<UserModel[]> {
        this.logger.info("Getting all users");
        return this.userService.findAllUser();
    }

    @Get("/:id")
    @OpenAPI({summary: "Get a user by ID"})
    @ResponseSchema(UserModel)
    @Authorized()
    async getUserById(@Param("id") userId: string): Promise<UserModel> {
        this.logger.info(`Getting user by id: ${userId}`);
        return this.userService.findUserById(userId);
    }

    @Post("/")
    @HttpCode(201)
    @OpenAPI({summary: "Create a new user"})
    @ResponseSchema(UserModel)
    async createUser(@Body() userData: CreateUserDto): Promise<UserModel> {
        this.logger.info(`Creating new user with email: ${userData.email}`);
        return this.userService.createUser(userData);
    }

    @Put("/:id")
    @OpenAPI({summary: "Update a user"})
    @ResponseSchema(UserModel)
    @Authorized()
    async updateUser(@Param("id") userId: string, @Body() userData: UpdateUserDto): Promise<UserModel> {
        this.logger.info(`Updating user: ${userId}`);
        return this.userService.updateUser(userId, userData);
    }

    @Delete("/:id")
    @OpenAPI({summary: "Delete a user"})
    @Authorized()
    async deleteUser(@Param("id") userId: string) {
        this.logger.info(`Deleting user: ${userId}`);
        await this.userService.deleteUser(userId);
        return {message: `User ${userId} successfully deleted`};
    }
}
