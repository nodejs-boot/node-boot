import {Model, Property} from "@node-boot/core";
import {IsEmail} from "class-validator";

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
