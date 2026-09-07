import {Body, Controller, Post} from "@nodeboot/core";
import {CreateUserDto} from "./CreateUserDto";

@Controller("/users")
export class UsersController {
    @Post()
    create(@Body() user: CreateUserDto): CreateUserDto {
        return user;
    }
}
