import {HttpException} from "../exceptions/httpException";
import {CreateUserDto, UpdateUserDto} from "../dtos/users.dto";
import {Logger} from "winston";
import {ConfigService} from "@node-boot/config";
import {Service} from "@node-boot/core";
import {NotFoundError} from "routing-controllers";
import {User, UserRepository} from "../persistence";
import {UserModel} from "../models/users.model";
import {Optional} from "@node-boot/hammer";

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
        const baseUrl = this.configService.getString("backend.baseUrl");
        this.logger.info(
            `Reading backend.baseUrl from app-config.yam: ${baseUrl}`,
        );
        return await this.userRepository.find();
    }

    public async findUserById(userId: number): Promise<User> {
        const user = await this.userRepository.findOneBy({
            id: userId,
        });
        return Optional.of(user)
            .orElseThrow(() => new NotFoundError("User doesn't exist"))
            .get();
    }

    public async createUser(userData: CreateUserDto): Promise<User> {
        const existingUser = await this.userRepository.findOneBy({
            email: userData.email,
        });

        return await Optional.of(existingUser)
            .ifPresentThrow(
                () =>
                    new HttpException(
                        409,
                        `This email ${userData.email} already exists`,
                    ),
            )
            .elseAsync(async () => await this.userRepository.save(userData));
    }

    public async updateUser(
        userId: number,
        userData: UpdateUserDto,
    ): Promise<User> {
        const user = await this.userRepository.findOneBy({
            id: userId,
        });

        return await Optional.of(user)
            .orElseThrow(() => new HttpException(409, "User doesn't exist"))
            .map(user => {
                return {
                    ...user,
                    userData,
                };
            })
            .runAsync(async user => await this.userRepository.save(user));
    }

    public async deleteUser(userId: number): Promise<void> {
        const user = await this.userRepository.findOneBy({
            id: userId,
        });

        await Optional.of(user)
            .orElseThrow(() => new HttpException(409, "User doesn't exist"))
            .runAsync(
                async user => await this.userRepository.delete({id: userId}),
            );
    }
}
