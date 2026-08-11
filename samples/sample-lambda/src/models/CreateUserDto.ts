import {IsEmail, IsNotEmpty, IsString, MaxLength, MinLength} from "class-validator";

export class CreateUserDto {
    @IsEmail()
    public email: string;

    @IsString()
    @IsNotEmpty()
    @MinLength(2)
    @MaxLength(64)
    public name: string;
}
