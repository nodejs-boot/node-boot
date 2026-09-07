import {Column, Entity, PrimaryGeneratedColumn} from "typeorm";

/**
 * Deliberately NOT synchronized - its table only exists because
 * `CreateAuditLogTable`/`@Migration()` created it. This app boots with
 * `migrationsRun: true, synchronize: false`, so there is no other path that could have created it.
 */
@Entity("audit_log")
export class AuditLog {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column()
    action!: string;
}
