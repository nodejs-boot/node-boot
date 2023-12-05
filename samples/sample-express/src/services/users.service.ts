import {HttpException} from "../exceptions/httpException";
import {CreateUserDto, UpdateUserDto} from "../dtos/users.dto";
import {Logger} from "winston";
import {ConfigService} from "@node-boot/config";
import {Service} from "@node-boot/core";
import {NotFoundError} from "routing-controllers";
import {User, UserRepository} from "../persistence";
import {UserModel} from "../models/users.model";
import {Optional} from "@node-boot/extension";
import {
    runOnTransactionCommit,
    runOnTransactionRollback,
    Transactional,
} from "@node-boot/starter-persistence";

@Service()
export class UserService {
    constructor(
        private readonly logger: Logger,
        private readonly configService: ConfigService,
        private readonly userRepository: UserRepository,
    ) {
        UserModel.forEach(user => this.userRepository.save(user));
    }

    public async findAllUser(): Promise<User[]> {
        this.logger.info("Getting all users");
        const appName = this.configService.getString("node-boot.app.name");
        this.logger.info(
            `Reading node-boot.app.name from app-config.yam: ${appName}`,
        );
        return this.userRepository.find();
    }

    public async findWithCustomQuery(): Promise<User[]> {
        this.logger.info("Getting all users with a custom query");
        return this.userRepository.findByQueryIn();
    }

    public async findUserById(userId: number): Promise<User> {
        const user = await this.userRepository.findOneBy({
            id: userId,
        });
        return Optional.of(user)
            .orElseThrow(() => new NotFoundError("User doesn't exist"))
            .get();
    }

    @Transactional()
    public async createUser(userData: CreateUserDto): Promise<User> {
        const existingUser = await this.userRepository.findOneBy({
            email: userData.email,
        });

        runOnTransactionCommit(() => {
            this.logger.info("Transaction was successfully committed");
        });

        return Optional.of(existingUser)
            .ifPresentThrow(
                () =>
                    new HttpException(
                        409,
                        `This email ${userData.email} already exists`,
                    ),
            )
            .elseAsync(() => this.userRepository.save(userData));
    }

    @Transactional()
    public async updateUser(
        userId: number,
        userData: UpdateUserDto,
    ): Promise<User> {
        const user = await this.userRepository.findOneBy({
            id: userId,
        });

        return Optional.of(user)
            .orElseThrow(() => new HttpException(409, "User doesn't exist"))
            .map(user => {
                return {
                    ...user,
                    userData,
                };
            })
            .runAsync(async user => await this.userRepository.save(user));
    }

    @Transactional()
    public async deleteUser(userId: number): Promise<void> {
        const user = await this.userRepository.findOneBy({
            id: userId,
        });

        runOnTransactionRollback(error => {
            this.logger.warn(
                "Transactions was rolled back due to error:",
                error,
            );
        });

        await Optional.of(user)
            .orElseThrow(() => new HttpException(409, "User doesn't exist"))
            .runAsync(user => this.userRepository.delete({id: userId}));

        throw new Error(
            "Error after deleting that should rollback transaction",
        );
    }
}
