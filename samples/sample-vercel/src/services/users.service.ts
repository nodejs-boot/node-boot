import {randomUUID} from "node:crypto";
import {Service} from "@nodeboot/core";
import {NotFoundError} from "@nodeboot/error";
import {Logger} from "winston";
import {CreateUserDto} from "../models/CreateUserDto";
import {UserModel} from "../models/UserModel";

/**
 * A minimal, in-memory user store.
 *
 * NOTE: Since this Serverless Function instance may be reused across invocations (warm start)
 * but is never guaranteed to persist, this in-memory store is here purely to keep the sample
 * simple and self-contained. For real applications, replace this with a durable store reachable
 * from Vercel Functions, such as Vercel Postgres/KV, PlanetScale or any external database
 * (NodeBoot's `@nodeboot/starter-persistence` package works on Vercel too).
 */
@Service()
export class UserService {
    private readonly users = new Map<string, UserModel>();

    constructor(private readonly logger: Logger) {}

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
