import {IsEmail, IsNotEmpty, IsString, MaxLength, MinLength} from "class-validator";
import {Model} from "@nodeboot/starter-openapi";

@Model()
export class CreateUserDto {
    @IsEmail()
    public email: string;

    @IsString()
    public name: string;

    @IsString()
    @IsNotEmpty()
    @MinLength(9)
    @MaxLength(32)
    public password: string;
}
