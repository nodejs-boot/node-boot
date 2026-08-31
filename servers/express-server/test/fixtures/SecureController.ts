import {Controller, Get} from "@nodeboot/core";
import {Authorized, CurrentUser} from "@nodeboot/authorization";

@Controller("/secure")
export class SecureController {
    @Get()
    @Authorized()
    async whoAmI(@CurrentUser() user: any): Promise<Record<string, any>> {
        return {user};
    }

    @Get("/admin")
    @Authorized(["ADMIN"])
    async adminOnly(): Promise<Record<string, any>> {
        return {ok: true};
    }
}
