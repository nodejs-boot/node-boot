import {Property} from "@nodeboot/core";
import {IsEmail} from "class-validator";
import {Model} from "@nodeboot/starter-openapi";

@Model()
export class UserModel {
    @Property({description: "User ID"})
    id: number;

    @Property({description: "User email address"})
    @IsEmail()
    email: string;

    @Property({description: "User name"})
    name?: string;
}
