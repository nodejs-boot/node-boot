import {Controller, CursorPage, CursorRequest, Get, Page, PagingRequest, QueryParams} from "@nodeboot/core";
import {UserModel} from "../models";
import {Logger} from "winston";
import {PagingUserRepository} from "../persistence";

@Controller("/paging", "v1")
export class PagingUserController {
    constructor(private readonly userRepository: PagingUserRepository, private readonly logger: Logger) {}

    @Get("/paginated")
    async getUsersPaginated(@QueryParams() paging: PagingRequest): Promise<Page<UserModel>> {
        this.logger.info(`Getting paginated users`);
        return this.userRepository.findPaginated({}, paging);
    }

    @Get("/cursor")
    async getUsersCursorPaginated(@QueryParams() cursorRequest: CursorRequest): Promise<CursorPage<UserModel>> {
        this.logger.info(`Getting cursor paginated users`);
        return this.userRepository.findCursorPaginated({}, cursorRequest);
    }

    @Get("/paginated/filter")
    async getUsersPaginatedWithFilter(@QueryParams() paging: PagingRequest): Promise<Page<UserModel>> {
        this.logger.info(`Getting paginated users`);
        return this.userRepository.findPaginated({email: "example3@email.com"}, paging);
    }

    @Get("/cursor/filter")
    async getUsersCursorPaginatedWithFilter(
        @QueryParams() cursorRequest: CursorRequest,
    ): Promise<CursorPage<UserModel>> {
        this.logger.info(`Getting cursor paginated users`);
        return this.userRepository.findCursorPaginated({email: "example3@email.com"}, cursorRequest);
    }
}
