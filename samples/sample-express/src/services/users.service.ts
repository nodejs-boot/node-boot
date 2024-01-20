import {CreateUserDto, UpdateUserDto} from "../dtos/users.dto";
import {Logger} from "winston";
import {Service} from "@node-boot/core";
import {User, UserRepository} from "../persistence";
import {UserModel} from "../models/users.model";
import {runOnTransactionCommit, runOnTransactionRollback, Transactional} from "@node-boot/starter-persistence";
import {HttpError, NotFoundError} from "@node-boot/error";
import {ConfigService} from "@node-boot/config";
import {Optional, Range} from "katxupa";

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
        this.logger.info(`Reading node-boot.app.name from app-config.yam: ${appName}`);

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

        (1)
            .letIt(it => {
                return it;
            })
            .runIt(function* () {});

        const person = {name: "Manuel", email: "ney.br.santos@gmail.com", age: 35};
        person
            .letIt(it => {
                console.log(it);
                it.age < 30 ? console.log("Young Man") : console.log("Old Man");
                return it.age;
            })
            .alsoIt(it => {
                console.log(`Actual Age is ${it}`);
            });

        durationOf(1000)
            .inWholeSeconds()
            .letIt(it => {
                console.log(`1000 milliseconds are the same as ${it} seconds`);
            });
        const xpto = 1;
        xpto.letIt(it => {
            it++;
            it = it * 100;
            return it;
        });

        user?.letIt(it => it.email);

        user?.runIt(function () {
            this.email;
        });

        runIt(() => {
            return 10;
        });

        rangeTo(1, 5, 2).runIt(function () {
            console.log(`multiplying the following sequence of numbers: ${this}`);
            this.map(it => it * 2).forEach(it => console.log(it));
        });

        optionalOf(null);
        inRange(1, 1, 5);
        Range.inRange(1, 1, 5);

        (1).years().add((6).months()).toString(); // Output: 548d 0h 0m 0s 0ns

        return optionalOf(user)
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
            .ifPresentThrow(() => new HttpError(409, `This email ${userData.email} already exists`))
            .elseAsync(() => this.userRepository.save(userData));
    }

    @Transactional()
    public async updateUser(userId: number, userData: UpdateUserDto): Promise<User> {
        const user = await this.userRepository.findOneBy({
            id: userId,
        });

        return Optional.of(user)
            .orElseThrow(() => new HttpError(409, "User doesn't exist"))
            .map(user => {
                return {
                    ...user,
                    userData,
                };
            })
            .runAsync(user => this.userRepository.save(user));
    }

    @Transactional()
    public async deleteUser(userId: number): Promise<void> {
        const user = await this.userRepository.findOneBy({
            id: userId,
        });

        runOnTransactionRollback(error => {
            this.logger.warn("Transactions was rolled back due to error:", error);
        });

        await Optional.of(user)
            .orElseThrow(() => new HttpError(409, "User doesn't exist"))
            .runAsync(() => this.userRepository.delete({id: userId}));

        throw new Error("Error after deleting that should rollback transaction");
    }
}
