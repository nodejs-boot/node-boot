import {EntityEventSubscriber} from "@node-boot/starter-persistence";
import {EntitySubscriberInterface, InsertEvent} from "typeorm";
import {User} from "../entities";
import {Inject} from "@node-boot/di";
import {Logger} from "winston";
import {GreetingService} from "../../services/greeting.service";

@EntityEventSubscriber()
export class UserEntityEventListener implements EntitySubscriberInterface<User> {
    @Inject()
    private logger: Logger;

    @Inject()
    private greetingService: GreetingService;

    /**
     * Indicates that this subscriber only listen to User events.
     */
    listenTo() {
        return User;
    }

    /**
     * Called before user insertion.
     */
    beforeInsert(event: InsertEvent<User>) {
        this.logger.info(`BEFORE USER INSERTED: `, event.entity);
    }

    afterInsert(event: InsertEvent<User>): Promise<any> | void {
        this.logger.info(`AFTER USER INSERTED: `, event.entity);
        this.greetingService.sayHello(event.entity);
    }
}
