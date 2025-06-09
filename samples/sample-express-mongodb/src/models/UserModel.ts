import {Property} from "@nodeboot/core";
import {IsEmail} from "class-validator";
import {Model} from "@nodeboot/starter-openapi";
import {Role} from "./Role";

@Model()
export class UserModel {
    @Property({description: "User id"})
    id?: string;

    @Property({description: "User email address"})
    @IsEmail()
    email: string;

    @Property()
    name?: string;

    @Property({itemType: Role})
    roles?: Role[];
}
