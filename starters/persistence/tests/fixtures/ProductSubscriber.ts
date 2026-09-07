import {EntitySubscriberInterface, InsertEvent} from "typeorm";
import {EntityEventSubscriber} from "../../src";
import {Product} from "./Product.entity";

/** Each entry is `<hook>:<product.name>` - not the entity class name. */
export const subscriberEvents: string[] = [];

@EntityEventSubscriber()
export class ProductSubscriber implements EntitySubscriberInterface<Product> {
    listenTo() {
        return Product;
    }

    beforeInsert(event: InsertEvent<Product>): void {
        subscriberEvents.push(`beforeInsert:${event.entity.name}`);
    }

    afterInsert(event: InsertEvent<Product>): void {
        subscriberEvents.push(`afterInsert:${event.entity.name}`);
    }
}
