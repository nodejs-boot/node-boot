import {Repository} from "typeorm";
import {ChatMemoryMessageEntity} from "../entity";

/**
 * Plain TypeORM repository for {@link ChatMemoryMessageEntity}.
 *
 * Intentionally **not** decorated with `@DataRepository` at module scope: it is registered with
 * `PersistenceContext` programmatically, only when `@EnableChatMemory({type: "sql"})` is actually used
 * (see `decorator/EnableChatMemory.ts`). This keeps the Mongo entity out of the SQL `DataSource` (and
 * vice versa) — only the backend the application opts into ever reaches TypeORM.
 *
 * @author Manuel Santos <https://github.com/manusant>
 */
export class ChatMemoryMessageRepository extends Repository<ChatMemoryMessageEntity> {}
