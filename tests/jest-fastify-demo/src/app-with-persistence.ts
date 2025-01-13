import "reflect-metadata";
import {Container} from "typedi";
import {
    Body,
    ClassToPlainTransform,
    Controller,
    Controllers,
    Delete,
    EnableClassTransformer,
    Get,
    NodeBoot,
    NodeBootApp,
    NodeBootApplication,
    NodeBootAppView,
    Param,
    PlainToClassTransform,
    Post,
    Service,
} from "@node-boot/core";
import {EnableDI} from "@node-boot/di";
import {Logger} from "winston";
import {JsonObject} from "@node-boot/context";
import {Column, Entity, PrimaryGeneratedColumn, Repository} from "typeorm";
import {
    DataRepository,
    DatasourceConfiguration,
    EnableRepositories,
    Transactional,
} from "@node-boot/starter-persistence";
import {IsEmail, IsNotEmpty, IsString, MaxLength, MinLength} from "class-validator";
import {HttpError} from "@node-boot/error";
import {FastifyServer} from "@node-boot/fastify-server";

@Entity()
export class UserEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    email: string;

    @Column()
    password: string;

    @Column({nullable: true})
    name?: string; // New field
}

export class UserModel {
    @IsEmail()
    public email: string;

    @IsString()
    public name: string;

    @IsString()
    @IsNotEmpty()
    @MinLength(9)
    @MaxLength(32)
    public password: string;
}

@DataRepository(UserEntity)
export class UserRepository extends Repository<UserEntity> {}

@Service()
export class UserService {
    constructor(private readonly logger: Logger, private readonly userRepository: UserRepository) {}

    public async findAllUser(): Promise<UserEntity[]> {
        this.logger.info("Getting all users");
        return this.userRepository.find();
    }

    @Transactional()
    public async createUser(userData: UserModel): Promise<UserEntity> {
        const existingUser = await this.userRepository.findOneBy({
            email: userData.email,
        });

        return optionalOf(existingUser)
            .ifPresentThrow(() => new HttpError(409, `This email ${userData.email} already exists`))
            .elseAsync(() => this.userRepository.save(userData));
    }

    @Transactional()
    public async deleteUser(userId: number): Promise<void> {
        const user = await this.userRepository.findOneBy({
            id: userId,
        });

        await optionalOf(user)
            .orElseThrow(() => new HttpError(409, "User doesn't exist"))
            .runAsync(() => this.userRepository.delete({id: userId}));

        throw new Error("Error after deleting that should rollback transaction");
    }
}

@Controller("/users")
class UserController {
    constructor(private readonly userService: UserService) {}

    @Get("/")
    async getUsers(): Promise<UserEntity[]> {
        return this.userService.findAllUser();
    }

    @Post("/")
    async createUser(@Body() userData: UserModel): Promise<UserEntity> {
        return this.userService.createUser(userData);
    }

    @Delete("/:id")
    async deleteUser(@Param("id") userId: number) {
        await this.userService.deleteUser(userId);
        return {message: `User ${userId} successfully deleted`};
    }
}

@DatasourceConfiguration({
    type: "better-sqlite3",
    database: ":memory:",
    synchronize: true,
    migrationsRun: false,
})
export class TestDatasourceConfiguration {}

@EnableClassTransformer({enabled: false})
@ClassToPlainTransform({
    strategy: "exposeAll",
})
@PlainToClassTransform({
    strategy: "exposeAll",
})
export class ClassTransformConfiguration {}

@EnableDI(Container)
@NodeBootApplication()
@Controllers([UserController])
@EnableRepositories()
export class TestAppWithPersistence implements NodeBootApp {
    start(additionalConfig?: JsonObject): Promise<NodeBootAppView> {
        return NodeBoot.run(FastifyServer, additionalConfig);
    }
}
