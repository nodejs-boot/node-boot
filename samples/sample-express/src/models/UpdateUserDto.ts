import {IsNotEmpty, IsString, MaxLength, MinLength} from "class-validator";
import {Model} from "@nodeboot/starter-openapi";

@Model()
export class UpdateUserDto {
    @IsString()
    @IsNotEmpty()
    @MinLength(9)
    @MaxLength(32)
    public password: string;
}
