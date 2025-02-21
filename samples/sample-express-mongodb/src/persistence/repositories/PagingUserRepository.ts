import {DataRepository, MongoPagingAndSortingRepository} from "@nodeboot/starter-persistence";
import {User} from "../entities";

@DataRepository(User)
export class PagingUserRepository extends MongoPagingAndSortingRepository<User> {}
