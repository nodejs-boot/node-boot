import {Body, Controller, Delete, Get, HttpCode, Param, Post, Put} from "@nodeboot/core";
import {UserService} from "../services/users.service";
import {CreateUserDto, UpdateUserDto, UserModel} from "../models";
import {AppConfigProperties} from "../config/AppConfigProperties";
import {Logger} from "winston";
import {Inject} from "@nodeboot/di";
import {OpenAPI, ResponseSchema} from "@nodeboot/starter-openapi";
import {Authorized} from "@nodeboot/authorization";

@Controller("/users", "v1")
export class UserController {
    constructor(
        private readonly user: UserService,
        private readonly logger: Logger,
        @Inject("app-config")
        private readonly appConfigProperties: AppConfigProperties,
    ) {}

    @Get("/")
    @ResponseSchema(UserModel, {isArray: true, description: "Return a list of users"})
    async getUsers(): Promise<UserModel[]> {
        this.logger.info(`Injected backend configuration properties: ${JSON.stringify(this.appConfigProperties)}`);
        return this.user.findAllUser();
    }

    @Get("/external/")
    @ResponseSchema(UserModel, {isArray: true, description: "Return a list of users retrieved from external API"})
    async getExternalUsers(): Promise<UserModel[]> {
        return this.user.findExternalUsers();
    }

    @Get("/query/")
    @OpenAPI({summary: "Return a list of users using a custom query"})
    @ResponseSchema(UserModel, {isArray: true})
    async getWithCustomQuery(): Promise<UserModel[]> {
        return this.user.findWithCustomQuery();
    }

    @Get("/:id")
    @OpenAPI({summary: "Return find a user"})
    @ResponseSchema(UserModel)
    async getUserById(@Param("id") userId: number): Promise<UserModel> {
        return this.user.findUserById(userId);
    }

    @Post("/")
    @HttpCode(201)
    @Authorized()
    @OpenAPI({summary: "Create a new user"})
    @ResponseSchema(UserModel)
    async createUser(@Body() userData: CreateUserDto): Promise<UserModel> {
        return this.user.createUser(userData);
    }

    @Put("/:id")
    @OpenAPI({summary: "Update a user"})
    @ResponseSchema(UserModel)
    async updateUser(@Param("id") userId: number, @Body() userData: UpdateUserDto): Promise<UserModel> {
        return this.user.updateUser(userId, userData);
    }

    @Delete("/:id")
    @OpenAPI({summary: "Delete a user"})
    async deleteUser(@Param("id") userId: number) {
        await this.user.deleteUser(userId);
        return {message: `User ${userId} successfully deleted`};
    }
}
