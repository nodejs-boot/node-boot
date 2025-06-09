import {Page} from "@nodeboot/core";
import {UserModel} from "./UserModel";
import {Model} from "@nodeboot/starter-openapi";

@Model({T: UserModel})
export class UserPage extends Page<UserModel> {}
