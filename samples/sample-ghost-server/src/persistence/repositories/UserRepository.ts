import {Repository} from "typeorm";
import {DataRepository} from "@nodeboot/starter-persistence";
import {User} from "../entities";

@DataRepository(User)
export class UserRepository extends Repository<User> {
    /**
     * Example custom query using the built-in query builder.
     *
     * For detailed info check: https://orkhan.gitbook.io/typeorm/docs/select-query-builder
     * */
    findByQueryIn() {
        // SELECT ... FROM users user WHERE user.id IN (1, 2)
        return this.createQueryBuilder("user")
            .where("user.id IN (:...ids)", {ids: [1, 2]})
            .getMany();
    }
}
