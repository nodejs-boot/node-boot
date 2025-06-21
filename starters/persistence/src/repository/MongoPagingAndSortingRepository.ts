import {FindOptionsWhere, MongoRepository, ObjectLiteral} from "typeorm";
import {CursorPage, CursorRequest, Page, PagingRequest, SortOrder} from "@nodeboot/core";
import {ObjectId} from "mongodb";

/**
 * A generic MongoDB repository that provides both offset-based and cursor-based pagination.
 * This can be extended by application repositories to support pagination out of the box.
 *
 * @template Entity - The database entity type (e.g., User, Product, Post)
 *
 * @example Offset-based pagination
 * ```ts
 * class UserRepository extends MongoPagingAndSortingRepository<User> {}
 *
 * const page = await userRepository.findPaginated({}, { page: 1, pageSize: 20 });
 * ```
 *
 * @example Cursor-based pagination
 * ```ts
 * class UserRepository extends MongoPagingAndSortingRepository<User> {}
 *
 * const cursorPage = await userRepository.findCursorPaginated({}, { pageSize: 10, lastId: "..." });
 * ```
 *
 * @author Manuel Santos <https://github.com/manusant>
 */
export class MongoPagingAndSortingRepository<Entity extends ObjectLiteral> extends MongoRepository<Entity> {
    /**
     * Finds a single entity by its ID.
     *
     * @param id - The ID of the entity to find. Can be a string, number, ObjectId, or Uint8Array.
     * @returns A promise that resolves to the found entity or null if not found.
     */
    async findById(id: string | number | ObjectId | Uint8Array): Promise<Entity | null> {
        return this.findOneBy({_id: new ObjectId(id)});
    }

    /**
     * Offset-based pagination (Traditional Pagination)
     *
     * This method retrieves paginated results using `LIMIT` and `SKIP`.
     * It is useful when you need **random access to pages** (e.g., "Jump to page 3").
     *
     * However, for large datasets, this method can be **inefficient** because SKIP requires scanning records before fetching.
     *
     * @param filter - MongoDB-like filter object `{ field: value }`
     * @param options - Pagination options containing:
     *  - page - The page number (starting from 1, default: 1)
     *  - pageSize - Number of items per page (default: 10)
     *  - sortField - The field used for sorting (default: `_id`)
     *  - sortOrder - The sort direction (`ASC` for ascending, `DESC` for descending, default: `DESC`)
     *
     * @returns An object containing:
     *  - `page`: Current page number
     *  - `pageSize`: Number of records per page
     *  - `totalItems`: Total number of records
     *  - `totalPages`: Total pages based on total items
     *  - `items`: Array of paginated records
     */
    async findPaginated(filter: FindOptionsWhere<Entity> = {}, options: PagingRequest): Promise<Page<Entity>> {
        const {page = 1, pageSize = 10, sortField = "_id" as keyof Entity, sortOrder = SortOrder.DESC} = options;

        // Ensure valid page and pageSize
        const validPage = Math.max(1, page);
        const validPageSize = Math.max(1, pageSize);

        // Calculate number of records to skip
        const skip = (validPage - 1) * validPageSize;

        // Fetch paginated data and count total items
        const [items, totalItems] = await Promise.all([
            this.find({
                where: filter,
                order: {[sortField]: sortOrder === SortOrder.ASC ? 1 : -1},
                skip,
                take: validPageSize,
            }),
            this.count(filter),
        ]);

        return {
            page: validPage,
            pageSize: validPageSize,
            totalItems,
            items,
            totalPages: Math.ceil(totalItems / pageSize),
        };
    }

    /**
     * Cursor-based pagination (Efficient Pagination)
     *
     * Instead of using SKIP, this method uses a **cursor** (`_id` or another indexed field) to fetch the next page.
     * This is **more efficient for large datasets** because it avoids skipping records.
     *
     * This method is ideal for **infinite scrolling** or **continuous data loading** (e.g., social media feeds).
     *
     * @param filter - MongoDB-like filter object `{ field: value }`
     * @param options - Pagination options containing:
     *  - pageSize - Number of items per page (default: 10)
     *  - lastId - The `_id` of the last item from the previous page (optional)
     *  - sortField - The field used for sorting (default: `_id`)
     *  - sortOrder - The sort direction (`ASC` for ascending, `DESC` for descending, default: `ASC`)
     *
     * @returns An object containing:
     *  - `pageSize`: Number of records per page
     *  - `lastId`: The `_id` of the last record from the current page (used as a cursor for the next page)
     *  - `items`: Array of paginated records
     */
    async findCursorPaginated(
        filter: FindOptionsWhere<Entity> = {},
        options: CursorRequest,
    ): Promise<CursorPage<Entity>> {
        const {pageSize = 10, lastId, sortField = "_id" as keyof Entity, sortOrder = SortOrder.ASC} = options;

        const query: FindOptionsWhere<Entity> = {...filter};

        // Add cursor condition (_id > lastId for forward pagination)
        if (lastId) {
            (query as any)._id =
                sortOrder === SortOrder.ASC
                    ? {$gt: lastId} // Next page (ascending)
                    : {$lt: lastId}; // Previous page (descending)
        }

        // Fetch paginated data
        const items = await this.find({
            where: query,
            order: {[sortField]: sortOrder === SortOrder.ASC ? 1 : -1},
            take: pageSize,
        });

        // Get the last _id from the current page
        const newLastId: string = items.length > 0 ? items[items.length - 1]?.["_id"].toString() : null;

        return {
            pageSize,
            items,
            lastId: newLastId,
        };
    }
}
