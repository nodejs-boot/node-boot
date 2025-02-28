import {Body, Controller, Delete, Get, HttpCode, Param, Post, Put, UseBefore} from "@nodeboot/core";
import {UserService} from "../services/users.service";
import {ValidationMiddleware} from "../middlewares/validation.middleware";
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

    @Get("/v2/")
    @ResponseSchema(UserModel, {isArray: true, description: "Return a list of users"})
    async getUsersV2(): Promise<UserModel[]> {
        return this.user.findAllUserV2();
    }

    @Get("/v3/")
    @ResponseSchema(UserModel, {isArray: true, description: "Return a list of users"})
    async getUsersV3(): Promise<UserModel[]> {
        return this.user.findAllUserV3();
    }

    @Get("/v4/")
    @ResponseSchema(UserModel, {isArray: true, description: "Return a list of users"})
    async getUsersV4(): Promise<UserModel[]> {
        return this.user.findAllUserV4();
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
    @UseBefore(ValidationMiddleware(CreateUserDto))
    @OpenAPI({summary: "Create a new user"})
    @ResponseSchema(UserModel)
    async createUser(@Body() userData: CreateUserDto): Promise<UserModel> {
        return this.user.createUser(userData);
    }

    @Put("/:id")
    @UseBefore(ValidationMiddleware(UpdateUserDto))
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
