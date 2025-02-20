import {Model, Property} from "@nodeboot/core";
import {IsEmail} from "class-validator";

@Model()
export class UserModel {
    @Property({description: "User ID"})
    id?: string;

    @Property({description: "User email address"})
    @IsEmail()
    email: string;

    @Property({description: "User name"})
    name?: string;
}
