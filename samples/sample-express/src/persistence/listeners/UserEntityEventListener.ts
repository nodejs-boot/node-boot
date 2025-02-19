import {EntityEventSubscriber} from "@nodeboot/starter-persistence";
import {EntitySubscriberInterface, InsertEvent} from "typeorm";
import {User} from "../entities";
import {Inject} from "@nodeboot/di";
import {Logger} from "winston";
import {GreetingService} from "../../services/greeting.service";

/**
 * The UserEntityEventListener class is an event subscriber that listens to events related to the User entity.
 * It is responsible for logging information before and after a user is inserted, and also for invoking the sayHello
 * method of the GreetingService class.
 *
 * */
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
