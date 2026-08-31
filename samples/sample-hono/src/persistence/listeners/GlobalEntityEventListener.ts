import {EntityEventSubscriber} from "@nodeboot/starter-persistence";
import {
    EntitySubscriberInterface,
    InsertEvent,
    RecoverEvent,
    RemoveEvent,
    SoftRemoveEvent,
    TransactionCommitEvent,
    TransactionRollbackEvent,
    TransactionStartEvent,
    UpdateEvent,
} from "typeorm";
import {Logger} from "winston";
import {Inject} from "@nodeboot/di";

@EntityEventSubscriber()
export class GlobalEntityEventListener implements EntitySubscriberInterface {
    @Inject()
    private logger: Logger;

    /**
     * Called after entity is loaded.
     */
    afterLoad(entity: any) {
        this.logger.info(`AFTER ENTITY LOADED: `, entity);
    }

    /**
     * Called before entity insertion.
     */
    beforeInsert(event: InsertEvent<any>) {
        this.logger.info(`BEFORE ENTITY INSERTED: `, event.entity);
    }

    /**
     * Called after entity insertion.
     */
    afterInsert(event: InsertEvent<any>) {
        this.logger.info(`AFTER ENTITY INSERTED: `, event.entity);
    }

    /**
     * Called before entity update.
     */
    beforeUpdate(event: UpdateEvent<any>) {
        this.logger.info(`BEFORE ENTITY UPDATED: `, event.entity);
    }

    /**
     * Called after entity update.
     */
    afterUpdate(event: UpdateEvent<any>) {
        this.logger.info(`AFTER ENTITY UPDATED: `, event.entity);
    }

    /**
     * Called before entity removal.
     */
    beforeRemove(event: RemoveEvent<any>) {
        this.logger.info(`BEFORE ENTITY WITH ID ${event.entityId} REMOVED: `, event.entity);
    }

    /**
     * Called after entity removal.
     */
    afterRemove(event: RemoveEvent<any>) {
        this.logger.info(`AFTER ENTITY WITH ID ${event.entityId} REMOVED: `, event.entity);
    }

    /**
     * Called before entity removal.
     */
    beforeSoftRemove(event: SoftRemoveEvent<any>) {
        this.logger.info(`BEFORE ENTITY WITH ID ${event.entityId} SOFT REMOVED: `, event.entity);
    }

    /**
     * Called after entity removal.
     */
    afterSoftRemove(event: SoftRemoveEvent<any>) {
        this.logger.info(`AFTER ENTITY WITH ID ${event.entityId} SOFT REMOVED: `, event.entity);
    }

    /**
     * Called before entity recovery.
     */
    beforeRecover(event: RecoverEvent<any>) {
        this.logger.info(`BEFORE ENTITY WITH ID ${event.entityId} RECOVERED: `, event.entity);
    }

    /**
     * Called after entity recovery.
     */
    afterRecover(event: RecoverEvent<any>) {
        this.logger.info(`AFTER ENTITY WITH ID ${event.entityId} RECOVERED: `, event.entity);
    }

    /**
     * Called before transaction start.
     */
    beforeTransactionStart(_: TransactionStartEvent) {
        this.logger.info(`BEFORE TRANSACTION STARTED`);
    }

    /**
     * Called after transaction start.
     */
    afterTransactionStart(_: TransactionStartEvent) {
        this.logger.info(`AFTER TRANSACTION STARTED`);
    }

    /**
     * Called before transaction commit.
     */
    beforeTransactionCommit(_: TransactionCommitEvent) {
        this.logger.info(`BEFORE TRANSACTION COMMITTED`);
    }

    /**
     * Called after transaction commit.
     */
    afterTransactionCommit(_: TransactionCommitEvent) {
        this.logger.info(`AFTER TRANSACTION COMMITTED`);
    }

    /**
     * Called before transaction rollback.
     */
    beforeTransactionRollback(_: TransactionRollbackEvent) {
        this.logger.info(`BEFORE TRANSACTION ROLLBACK`);
    }

    /**
     * Called after transaction rollback.
     */
    afterTransactionRollback(_: TransactionRollbackEvent) {
        this.logger.info(`AFTER TRANSACTION ROLLBACK`);
    }
}
