import {Logger} from "winston";
import {Service} from "@nodeboot/core";
import {User} from "../persistence";

@Service()
export class GreetingService {
    constructor(private readonly logger: Logger) {}

    public sayHello(user: User): void {
        this.logger.info(`I'm really happy that you exists ${user.id}/${user.email}`);
    }
}
