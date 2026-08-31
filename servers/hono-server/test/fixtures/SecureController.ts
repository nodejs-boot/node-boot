import {Controller, Get} from "@nodeboot/core";
import {Authorized, CurrentUser} from "@nodeboot/authorization";

@Controller("/secure")
export class SecureController {
    /**
     * Regression test target: the authorization check runs as the first handler in the route's
     * chain and builds its own `HonoRequest`, before the controller action's own handler builds
     * another one for the same request - both must see the correct, request-scoped data.
     */
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
