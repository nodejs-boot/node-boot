import {CreateUserDto, UpdateUserDto} from "../models";
import {Logger} from "winston";
import {Service} from "@nodeboot/core";
import {User, UserRepository} from "../persistence";
import {HttpError, NotFoundError} from "@nodeboot/error";
import {ConfigService} from "@nodeboot/config";
import {Users} from "../persistence/users.init";
import {MongoClient} from "mongodb";

@Service()
export class UserService {
    constructor(
        private readonly logger: Logger,
        private readonly configService: ConfigService,
        private readonly userRepository: UserRepository,
        private readonly mongoClient: MongoClient,
    ) {
        Users.forEach(user => this.userRepository.save(user));
    }

    public async findAllUser(): Promise<User[]> {
        this.logger.info("Getting all users");
        const appName = this.configService.getString("app.name");
        this.logger.info(`Reading node-boot.app.name from app-config.yam: ${appName}`);

        return this.userRepository.find();
    }

    public async findAllUserV2(): Promise<User[]> {
        this.logger.info("Getting all users by using the mongo client directly");

        return this.mongoClient.db("test").collection<User>("user").find({}).toArray();
    }

    public async findUserById(userId: number): Promise<User> {
        const user = await this.userRepository.findOneBy({
            id: userId,
        });

        return optionalOf(user)
            .orElseThrow(() => new NotFoundError("User doesn't exist"))
            .get();
    }

    public async createUser(userData: CreateUserDto): Promise<User> {
        const existingUser = await this.userRepository.findOneBy({
            email: userData.email,
        });

        return optionalOf(existingUser)
            .ifPresentThrow(() => new HttpError(409, `This email ${userData.email} already exists`))
            .elseAsync(() => this.userRepository.save(userData));
    }

    public async updateUser(userId: number, userData: UpdateUserDto): Promise<User> {
        const user = await this.userRepository.findOneBy({
            id: userId,
        });

        return optionalOf(user)
            .orElseThrow(() => new HttpError(409, "User doesn't exist"))
            .map(user => {
                return {
                    ...user,
                    userData,
                };
            })
            .runAsync(user => this.userRepository.save(user));
    }

    public async deleteUser(userId: number): Promise<void> {
        const user = await this.userRepository.findOneBy({
            id: userId,
        });

        await optionalOf(user)
            .orElseThrow(() => new HttpError(409, "User doesn't exist"))
            .runAsync(() => this.userRepository.deleteOne({_id: userId}));
    }
}
