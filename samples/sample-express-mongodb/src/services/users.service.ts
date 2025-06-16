import {CreateUserDto, UpdateUserDto} from "../models";
import {Logger} from "winston";
import {Service} from "@nodeboot/core";
import {User, UserRepository} from "../persistence";
import {HttpError, NotFoundError} from "@nodeboot/error";
import {ConfigService} from "@nodeboot/config";
import {Users} from "../persistence/users.init";
import {MongoClient} from "mongodb";
import {MicroserviceHttpClient} from "../clients/MicroserviceHttpClient";

@Service()
export class UserService {
    constructor(
        private readonly logger: Logger,
        private readonly configService: ConfigService,
        private readonly userRepository: UserRepository,
        private readonly mongoClient: MongoClient,
        private readonly httpClient: MicroserviceHttpClient,
    ) {
        // Workaround to load dummy users in the database
        this.userRepository.count({}).then(existingUsers => {
            if (!existingUsers) {
                Users.forEach(user => this.userRepository.save(user));
            }
        });
    }

    public async findAllUser(): Promise<User[]> {
        this.logger.info("Getting all users");
        const appName = this.configService.getString("app.name");
        this.logger.info(`Reading node-boot.app.name from app-config.yam: ${appName}`);
        return this.userRepository.find();
    }

    public async findExternalUsers(): Promise<User[]> {
        this.logger.info("Getting users from external service");
        const result = await this.httpClient.get("/users");
        this.logger.info(`Found ${result.data.length} users by calling external API`);
        return result.data;
    }

    public async findAllUserV2(): Promise<User[]> {
        this.logger.info("Getting all users by using the mongo client directly");

        return this.mongoClient.db("facts").collection<User>("users").find({}).toArray();
    }

    public async findAllUserV3(): Promise<User[]> {
        this.logger.info("Getting all users by using the mongo client directly");

        return this.userRepository.findAllUsingCollection();
    }

    public async findAllUserV4(): Promise<User[]> {
        this.logger.info("Getting all users by using the mongo client directly");
        return this.userRepository.findAllUsingClient();
    }

    public async findUserById(userId: number): Promise<User> {
        const user = await this.userRepository.findOneBy({
            id: userId,
        });

        optionalOf(user).orElseThrow(() => new NotFoundError("User doesn't exist"));
        return user!;
    }

    public async createUser(userData: CreateUserDto): Promise<User> {
        const existingUser = await this.userRepository.findOneBy({
            email: userData.email,
        });

        optionalOf(existingUser).ifPresentThrow(
            () => new HttpError(409, `This email ${userData.email} already exists`),
        );

        return this.userRepository.save(userData);
    }

    public async updateUser(userId: number, userData: UpdateUserDto): Promise<User> {
        const user = await this.userRepository.findOneBy({
            id: userId,
        });

        optionalOf(user).orElseThrow(() => new HttpError(409, "User doesn't exist"));

        return this.userRepository.save({
            ...user,
            userData,
        });
    }

    public async deleteUser(userId: number): Promise<void> {
        const user = await this.userRepository.findOneBy({
            id: userId,
        });

        optionalOf(user).orElseThrow(() => new HttpError(409, "User doesn't exist"));

        await this.userRepository.deleteOne({_id: userId});
    }
}
