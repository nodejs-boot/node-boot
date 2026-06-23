import {Property} from "@nodeboot/core";
import {IsEmail, IsString, IsOptional} from "class-validator";
import {Model} from "@nodeboot/starter-openapi";

@Model()
export class CreateUserDto {
    @Property({description: "User email address"})
    @IsEmail()
    email: string;

    @Property({description: "User name"})
    @IsString()
    @IsOptional()
    name?: string;
}

@Model()
export class UpdateUserDto {
    @Property({description: "User name"})
    @IsString()
    @IsOptional()
    name?: string;

    @Property({description: "User email address"})
    @IsEmail()
    @IsOptional()
    email?: string;
}

@Model()
export class UserModel {
    @Property({description: "User ID"})
    id: string;

    @Property({description: "User email address"})
    @IsEmail()
    email: string;

    @Property({description: "User name"})
    name?: string;

    @Property({description: "User roles"})
    roles?: string[];

    @Property({description: "Creation timestamp"})
    created_at?: string;

    @Property({description: "Update timestamp"})
    updated_at?: string;
}
