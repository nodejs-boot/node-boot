import {Repository} from "typeorm";
import {DataRepository} from "@nodeboot/starter-persistence";
import {UserProfile} from "./UserProfile.entity";

@DataRepository(UserProfile)
export class UserProfileRepository extends Repository<UserProfile> {}
