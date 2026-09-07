import "reflect-metadata";
import {
    Body,
    Controller,
    Delete,
    Get,
    HeaderParam,
    HttpCode,
    Param,
    Post,
    Property,
    Put,
    QueryParam,
} from "@nodeboot/core";
import {IsEmail, IsNotEmpty, MinLength} from "class-validator";
import {Model, OpenAPI, ResponseSchema} from "../../src";

@Model()
export class AddressModel {
    @Property({description: "Street address"})
    street: string;

    @Property({description: "City name"})
    city: string;

    @Property({description: "Postal code", example: "10001"})
    zipCode?: string;
}

export enum UserRole {
    ADMIN = "ADMIN",
    USER = "USER",
    GUEST = "GUEST",
}

@Model()
export class UserModel {
    @Property({description: "Unique user identifier", example: 1})
    id: number;

    @Property({description: "User full name", example: "Jane Doe"})
    name: string;

    @Property({description: "User email address", example: "jane.doe@example.com"})
    @IsEmail()
    email: string;

    @Property({description: "User role", enum: Object.values(UserRole)})
    role?: string;

    @Property({description: "User residential address", type: AddressModel})
    address?: AddressModel;

    @Property({description: "User tags / interests", type: "array", itemType: "string"})
    tags?: string[];

    @Property({description: "User creation timestamp", type: "date"})
    createdAt?: Date;

    @Property({description: "Active status flag", nullable: true})
    isActive?: boolean;
}

@Model()
export class CreateUserDto {
    @Property({required: true, description: "Name of the user"})
    @IsNotEmpty()
    name: string;

    @Property({required: true, description: "Email of the user"})
    @IsEmail()
    @IsNotEmpty()
    email: string;

    @Property({required: true, description: "Account password"})
    @MinLength(8)
    password: string;

    @Property({required: false, description: "Optional address", type: AddressModel})
    address?: AddressModel;
}

@Model()
export class UpdateUserDto {
    @Property({description: "Updated user name"})
    name?: string;

    @Property({description: "Updated email"})
    @IsEmail()
    email?: string;
}

@Model({T: UserModel})
export class PaginatedUsersResponse {
    @Property({required: true, description: "Current page index", example: 0})
    page: number;

    @Property({required: true, description: "Page size", example: 20})
    size: number;

    @Property({required: true, description: "Total number of users", example: 100})
    total: number;

    @Property({required: true, description: "List of users on this page", type: "array", itemType: "T"})
    content: UserModel[];
}

@Controller("/api/v1/users")
export class UserController {
    @Get("/")
    @OpenAPI({summary: "List all users", description: "Returns a paginated list of registered users"})
    @ResponseSchema(UserModel, {isArray: true, description: "Array of users"})
    getUsers(): UserModel[] {
        return [];
    }

    @Get("/paginated")
    @OpenAPI({summary: "Get paginated users"})
    @ResponseSchema(PaginatedUsersResponse, {description: "Paginated user list"})
    getPaginatedUsers(@QueryParam("page") _page?: number, @QueryParam("size") _size?: number): PaginatedUsersResponse {
        return {page: 0, size: 20, total: 0, content: []};
    }

    @Get("/search")
    @OpenAPI({summary: "Search users by keyword"})
    @ResponseSchema(UserModel, {isArray: true})
    searchUsers(@QueryParam("q") _keyword: string, @HeaderParam("x-request-id") _requestId?: string): UserModel[] {
        return [];
    }

    @Get("/:id")
    @OpenAPI({summary: "Get user by ID", tags: ["UserOps"]})
    @ResponseSchema(UserModel, {description: "The requested user object"})
    getUserById(@Param("id") id: string): UserModel {
        return {id: Number(id), name: "User " + id, email: `user${id}@example.com`};
    }

    @Post("/")
    @HttpCode(201)
    @OpenAPI({summary: "Create a new user"})
    @ResponseSchema(UserModel, {statusCode: 201, description: "Created user"})
    createUser(@Body() body: CreateUserDto): UserModel {
        return {id: 1, name: body.name, email: body.email};
    }

    @Put("/:id")
    @OpenAPI({summary: "Update an existing user"})
    @ResponseSchema(UserModel, {description: "Updated user"})
    updateUser(@Param("id") id: string, @Body() body: UpdateUserDto): UserModel {
        return {id: Number(id), name: body.name || "Updated", email: body.email || "updated@example.com"};
    }

    @Delete("/:id")
    @HttpCode(204)
    @OpenAPI({summary: "Delete a user by ID"})
    @ResponseSchema("string", {statusCode: 204, description: "User deleted successfully"})
    deleteUser(@Param("id") _id: string): string {
        return "";
    }
}
