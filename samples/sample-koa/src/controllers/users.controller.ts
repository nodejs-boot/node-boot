import {Body, Controller, Delete, Get, HttpCode, Param, Post, Put, UseBefore} from "@node-boot/core";
import {UserService} from "../services/users.service";
import {ValidationMiddleware} from "../middlewares/validation.middleware";
import {CreateUserDto, UpdateUserDto} from "../dtos/users.dto";
import {AppConfigProperties} from "../config/AppConfigProperties";
import {Logger} from "winston";
import {Inject} from "@node-boot/di";
import {OpenAPI} from "@node-boot/openapi";
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
    @OpenAPI({summary: "Return a list of users"})
    async getUsers() {
        this.logger.info(`Injected backend configuration properties: ${JSON.stringify(this.appConfigProperties)}`);
        const findAllUsersData: User[] = await this.user.findAllUser();
        return {data: findAllUsersData, message: "findAll"};
    }

    @Get("/query/")
    @OpenAPI({summary: "Return a list of users using a custom query"})
    async getWithCustomQuery() {
        const data: User[] = await this.user.findWithCustomQuery();
        return {data: data, message: "findWithCustomQuery"};
    }

    @Get("/:id")
    @OpenAPI({summary: "Return find a user"})
    async getUserById(@Param("id") userId: number) {
        const findOneUserData: User = await this.user.findUserById(userId);
        return {data: findOneUserData, message: "findOne"};
    }

    @Post("/")
    @HttpCode(201)
    @UseBefore(ValidationMiddleware(CreateUserDto))
    @OpenAPI({summary: "Create a new user"})
    @Authorized()
    async createUser(@Body() userData: User) {
        const createUserData: User = await this.user.createUser(userData);
        return {data: createUserData, message: "created"};
    }

    @Put("/:id")
    @UseBefore(ValidationMiddleware(UpdateUserDto))
    @OpenAPI({summary: "Update a user"})
    async updateUser(@Param("id") userId: number, @Body() userData: User) {
        const updateUserData: User = await this.user.updateUser(userId, userData);
        return {data: updateUserData, message: "updated"};
    }

    @Delete("/:id")
    @OpenAPI({summary: "Delete a user"})
    async deleteUser(@Param("id") userId: number) {
        await this.user.deleteUser(userId);
        return {message: `User ${userId} successfully deleted`};
    }
}
