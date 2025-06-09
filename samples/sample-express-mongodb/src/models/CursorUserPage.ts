import {UserModel} from "./UserModel";
import {Model} from "@nodeboot/starter-openapi";
import {CursorPage} from "@nodeboot/core";

@Model({T: UserModel})
export class CursorUserPage extends CursorPage<UserModel> {}
