import {
    Body,
    Delete,
    Get,
    HttpCode,
    Param,
    Post,
    Put,
} from "routing-controllers";
import {UserService} from "../services/users.service";
import {User} from "../interfaces/users.interface";
import {BackendConfigProperties} from "../config/BackendConfigProperties";
import {Logger} from "winston";
import {Controller} from "@node-boot/core";
import {Inject} from "@node-boot/di";
import {OpenAPI} from "@node-boot/openapi";
import {Authorized, CurrentUser} from "@node-boot/authorization";

@Controller()
export class UserController {
    constructor(
        private readonly user: UserService,
        private readonly logger: Logger,
        @Inject("backend-config")
        private readonly backendConfigProperties: BackendConfigProperties,
    ) {}

    @Get("/users")
    @Authorized()
    @OpenAPI({summary: "Return a list of users"})
    async getUsers(@CurrentUser() loggedIn: any) {
        this.logger.info(
            `Injected backend configuration properties: ${JSON.stringify(
                this.backendConfigProperties,
            )}`,
        );
        this.logger.info(`Logged in user is ${loggedIn.username}`);
        const findAllUsersData: User[] = await this.user.findAllUser();
        return {data: findAllUsersData, message: "findAll"};
    }

    @Get("/users/:id")
    @OpenAPI({summary: "Return find a user"})
    async getUserById(@Param("id") userId: number) {
        const findOneUserData: User = await this.user.findUserById(userId);
        return {data: findOneUserData, message: "findOne"};
    }

    @Post("/users")
    @HttpCode(201)
    @OpenAPI({summary: "Create a new user"})
    @Authorized()
    async createUser(@Body() userData: User) {
        const createUserData: User = await this.user.createUser(userData);
        return {data: createUserData, message: "created"};
    }

    @Put("/users/:id")
    @OpenAPI({summary: "Update a user"})
    async updateUser(@Param("id") userId: number, @Body() userData: User) {
        const updateUserData: User[] = await this.user.updateUser(
            userId,
            userData,
        );
        return {data: updateUserData, message: "updated"};
    }

    @Delete("/users/:id")
    @OpenAPI({summary: "Delete a user"})
    async deleteUser(@Param("id") userId: number) {
        const deleteUserData: User[] = await this.user.deleteUser(userId);
        return {data: deleteUserData, message: "deleted"};
    }
}
