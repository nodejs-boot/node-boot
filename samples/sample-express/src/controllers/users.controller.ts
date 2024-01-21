import {Body, Controller, Delete, Get, HttpCode, Param, Post, Put, UseBefore} from "@node-boot/core";
import {UserService} from "../services/users.service";
import {ValidationMiddleware} from "../middlewares/validation.middleware";
import {CreateUserDto, UpdateUserDto} from "../dtos/users.dto";
import {AppConfigProperties} from "../config/AppConfigProperties";
import {Logger} from "winston";
import {Inject} from "@node-boot/di";
import {OpenAPI, ResponseSchema} from "@node-boot/starter-openapi";
import {Authorized} from "@node-boot/authorization";
import {User} from "../persistence";

@Controller("/users", "v1")
export class UserController {
    constructor(
        private readonly user: UserService,
        private readonly logger: Logger,
        @Inject("app-config")
        private readonly appConfigProperties: AppConfigProperties,
    ) {}

    @Get("/")
    @ResponseSchema(User, {isArray: true, description: "Return a list of users"})
    async getUsers() {
        this.logger.info(`Injected backend configuration properties: ${JSON.stringify(this.appConfigProperties)}`);
        return this.user.findAllUser();
    }

    @Get("/query/")
    @OpenAPI({summary: "Return a list of users using a custom query"})
    @ResponseSchema(User, {isArray: true})
    async getWithCustomQuery() {
        return this.user.findWithCustomQuery();
    }

    @Get("/:id")
    @OpenAPI({summary: "Return find a user"})
    @ResponseSchema(User)
    async getUserById(@Param("id") userId: number) {
        return this.user.findUserById(userId);
    }

    @Post("/")
    @HttpCode(201)
    @Authorized()
    @UseBefore(ValidationMiddleware(CreateUserDto))
    @OpenAPI({summary: "Create a new user"})
    @ResponseSchema(User)
    async createUser(@Body() userData: User) {
        return this.user.createUser(userData);
    }

    @Put("/:id")
    @UseBefore(ValidationMiddleware(UpdateUserDto))
    @OpenAPI({summary: "Update a user"})
    @ResponseSchema(User)
    async updateUser(@Param("id") userId: number, @Body() userData: User) {
        return this.user.updateUser(userId, userData);
    }

    @Delete("/:id")
    @OpenAPI({summary: "Delete a user"})
    async deleteUser(@Param("id") userId: number) {
        await this.user.deleteUser(userId);
        return {message: `User ${userId} successfully deleted`};
    }
}
