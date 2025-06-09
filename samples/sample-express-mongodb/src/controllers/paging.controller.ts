import {Controller, CursorRequest, Get, PagingRequest, QueryParams} from "@nodeboot/core";
import {Logger} from "winston";
import {PagingUserRepository} from "../persistence";
import {ResponseSchema} from "@nodeboot/starter-openapi";
import {UserPage} from "../models/UserPage";
import {CursorUserPage} from "../models/CursorUserPage";

@Controller("/paging", "v1")
export class PagingUserController {
    constructor(private readonly userRepository: PagingUserRepository, private readonly logger: Logger) {}

    @Get("/paginated")
    @ResponseSchema(UserPage)
    async getUsersPaginated(@QueryParams() paging: PagingRequest): Promise<UserPage> {
        this.logger.info(`Getting paginated users`);
        return this.userRepository.findPaginated({}, paging);
    }

    @Get("/cursor")
    @ResponseSchema(CursorUserPage)
    async getUsersCursorPaginated(@QueryParams() cursorRequest: CursorRequest): Promise<CursorUserPage> {
        this.logger.info(`Getting cursor paginated users`);
        return this.userRepository.findCursorPaginated({}, cursorRequest);
    }

    @Get("/paginated/filter")
    @ResponseSchema(UserPage)
    async getUsersPaginatedWithFilter(@QueryParams() paging: PagingRequest): Promise<UserPage> {
        this.logger.info(`Getting paginated users`);
        return this.userRepository.findPaginated({email: "example3@email.com"}, paging);
    }

    @Get("/cursor/filter")
    @ResponseSchema(CursorUserPage)
    async getUsersCursorPaginatedWithFilter(@QueryParams() cursorRequest: CursorRequest): Promise<CursorUserPage> {
        this.logger.info(`Getting cursor paginated users`);
        return this.userRepository.findCursorPaginated({email: "example3@email.com"}, cursorRequest);
    }
}
