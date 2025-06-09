import {IsString} from "class-validator";
import {Model} from "@nodeboot/starter-openapi";
import {Property} from "@nodeboot/core";

@Model()
export class Role {
    @IsString()
    public name: string;
    @Property({description: "Role Permissions", itemType: "string"})
    public permissions: string[];
}
