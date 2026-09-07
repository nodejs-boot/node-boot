import {MongoRepository} from "typeorm";
import {ChatMemoryMongoMessageEntity} from "../entity";

/**
 * Plain TypeORM Mongo repository for {@link ChatMemoryMongoMessageEntity}.
 *
 * Intentionally **not** decorated with `@DataRepository` at module scope: it is registered with
 * `PersistenceContext` programmatically, only when `@EnableChatMemory({type: "mongo"})` is actually used
 * (see `decorator/EnableChatMemory.ts`). This keeps the SQL entity out of the Mongo `DataSource` (and
 * vice versa) — only the backend the application opts into ever reaches TypeORM.
 *
 * @author Manuel Santos <https://github.com/manusant>
 */
export class ChatMemoryMongoMessageRepository extends MongoRepository<ChatMemoryMongoMessageEntity> {}
