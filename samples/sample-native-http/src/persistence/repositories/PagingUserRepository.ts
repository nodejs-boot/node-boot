import {DataRepository, PagingAndSortingRepository} from "@nodeboot/starter-persistence";
import {User} from "../entities";

@DataRepository(User)
export class PagingUserRepository extends PagingAndSortingRepository<User> {}
