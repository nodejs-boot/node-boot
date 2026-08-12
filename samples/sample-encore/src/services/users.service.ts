import {randomUUID} from "node:crypto";
import {Service} from "@nodeboot/core";
import {Inject} from "@nodeboot/di";
import {NotFoundError} from "@nodeboot/error";
import {Logger} from "winston";
import {CreateUserDto} from "../models/CreateUserDto";
import {UserModel} from "../models/UserModel";

/**
 * A minimal, in-memory user store.
 *
 * NOTE: This in-memory store is here purely to keep the sample simple and self-contained. For
 * real applications, replace this with a durable store, such as an Encore.ts SQL database
 * (`encore.dev/storage/sqldb`) or any external database (Node-Boot's `@nodeboot/starter-persistence`
 * package works with Encore.ts too).
 */
@Service()
export class UserService {
    private readonly users = new Map<string, UserModel>();

    // Encore.ts bundles with esbuild, which doesn't emit `design:paramtypes` metadata for
    // `emitDecoratorMetadata`. Without that metadata, typedi cannot determine constructor arity
    // and constructor injection silently breaks (it ends up passing the DI container itself as
    // the argument instead of the resolved dependency). Property injection doesn't rely on that
    // metadata, so it's used here instead.
    @Inject("logger")
    private logger: Logger;

    public findAll(): UserModel[] {
        this.logger.info("Getting all users");
        return Array.from(this.users.values());
    }

    public findById(id: string): UserModel {
        const user = this.users.get(id);
        if (!user) {
            throw new NotFoundError(`User ${id} not found`);
        }
        return user;
    }

    public create(userData: CreateUserDto): UserModel {
        const user: UserModel = {id: randomUUID(), ...userData};
        this.users.set(user.id, user);
        this.logger.info(`Created user ${user.id}`);
        return user;
    }

    public delete(id: string): void {
        if (!this.users.delete(id)) {
            throw new NotFoundError(`User ${id} not found`);
        }
    }
}
