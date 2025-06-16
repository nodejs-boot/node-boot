import {FindOptionsOrder, FindOptionsWhere, LessThan, MoreThan, ObjectLiteral, Repository} from "typeorm";
import {CursorPage, CursorRequest, Page, PagingRequest, SortOrder} from "@nodeboot/core";

/**
 * A generic repository that provides both offset-based and cursor-based pagination.
 * Designed for relational databases using TypeORM.
 *
 * Can be extended by custom repositories to provide pagination out-of-the-box.
 *
 * @template Entity - The database entity type (e.g., User, Post, Product)
 *
 * @example Offset-based pagination:
 * ```ts
 * class UserRepository extends PagingAndSortingRepository<User> {}
 * const result = await userRepository.findPaginated({}, { page: 1, pageSize: 20 });
 * ```
 *
 * @example Cursor-based pagination:
 * ```ts
 * const result = await userRepository.findCursorPaginated({}, {
 *   pageSize: 10,
 *   cursor: "2024-01-01T00:00:00.000Z",
 *   sortField: "createdAt",
 *   sortOrder: "DESC"
 * });
 * ```
 *
 * @author Manuel Santos <https://github.com/manusant>
 */
export class PagingAndSortingRepository<Entity extends ObjectLiteral> extends Repository<Entity> {
    /**
     * Offset-based pagination (Traditional Pagination)
     *
     * This method retrieves paginated results using `LIMIT` and `OFFSET`.
     * It is useful when you need **random access to pages** (e.g., "Jump to page 3").
     *
     * However, for large datasets, this method can be **inefficient** because OFFSET skips records before fetching.
     *
     * @param filter - TypeORM filter object `{ field: value }`
     * @param options - Pagination options containing:
     *  - page - The page number (starting from 1, default: 1)
     *  - pageSize - Number of items per page (default: 10)
     *  - sortField - The field used for sorting (default: `id`)
     *  - sortOrder - The sort direction (`"ASC"` or `"DESC"`, default: `"DESC"`)
     *
     * @returns An object containing:
     *  - `page`: Current page number
     *  - `pageSize`: Number of records per page
     *  - `totalItems`: Total number of records
     *  - `totalPages`: Total pages based on total items
     *  - `items`: Array of paginated records
     */
    async findPaginated(filter: FindOptionsWhere<Entity> = {}, options: PagingRequest): Promise<Page<Entity>> {
        const {page = 1, pageSize = 10, sortField = "id" as keyof Entity, sortOrder = SortOrder.DESC} = options;

        // Ensure valid page and pageSize
        const validPage = Math.max(1, page);
        const validPageSize = Math.max(1, pageSize);

        // Calculate number of records to skip
        const skip = (validPage - 1) * validPageSize;

        // Ensure TypeORM recognizes the sorting order
        const order = {[sortField]: sortOrder} as FindOptionsOrder<Entity>;

        // Fetch paginated data and count total items
        const [items, totalItems] = await this.findAndCount({
            where: filter,
            order: order,
            skip,
            take: validPageSize,
        });

        return {
            totalItems,
            items,
            pageSize: validPageSize,
            page: validPage,
            totalPages: Math.ceil(totalItems / pageSize),
        };
    }

    /**
     * Cursor-based pagination (Efficient Pagination)
     *
     * Instead of using OFFSET, this method uses a **cursor** (e.g., an `id` or `createdAt` value) to fetch the next page.
     * This is **more efficient for large datasets** because it avoids skipping records.
     *
     * This method is ideal for **infinite scrolling** or **continuous data loading** (e.g., social media feeds).
     *
     * @param filter - TypeORM filter object `{ field: value }`
     * @param options - Pagination Options containing:
     *  - pageSize - Number of items per page (default: 10)
     *  - cursor - The last seen value of the `sortField` from the previous page (optional)
     *  - sortField - The field used for sorting (default: `createdAt`)
     *  - sortOrder - The sort direction (`"ASC"` or `"DESC"`, default: `"DESC"`)
     *
     * @returns An object containing:
     *  - `pageSize`: Number of records per page
     *  - `cursor`: The last value of `sortField` from the current page (to fetch the next page)
     *  - `items`: Array of paginated records
     */
    async findCursorPaginated(
        filter: FindOptionsWhere<Entity> = {},
        options: CursorRequest,
    ): Promise<CursorPage<Entity>> {
        const {pageSize = 10, cursor, sortField = "createdAt" as keyof Entity, sortOrder = "DESC"} = options;

        // Clone filter object to avoid modifying the original
        const queryFilter: FindOptionsWhere<Entity> = {...filter};

        // Apply cursor condition if provided
        if (cursor) {
            (queryFilter as any)[sortField] = sortOrder === "ASC" ? MoreThan(cursor) : LessThan(cursor);
        }

        // Ensure TypeORM recognizes the sorting order
        const order = {[sortField]: sortOrder} as FindOptionsOrder<Entity>;

        // Fetch paginated data
        const items = await this.find({
            where: queryFilter,
            order: order,
            take: pageSize,
        });

        return {
            pageSize,
            items,
            cursor: items.length > 0 ? items[items.length - 1]?.[sortField].toString() : null,
        };
    }
}
