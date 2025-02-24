import {Model, Property} from "@nodeboot/core";
import {IsEmail} from "class-validator";

@Model()
export class UserModel {
    @Property({description: "User email address", itemType: "string"})
    id?: string;

    @Property({description: "User email address"})
    @IsEmail()
    email: string;

    name?: string;
}
