import {MigrationInterface, QueryRunner, Table} from "typeorm";
import {Migration} from "../../src";

/**
 * The only thing that ever creates the `audit_log` table in `MigrationApp` - that app boots with
 * `synchronize: false`, so there is no other path (entity metadata sync) that could have created it.
 */
@Migration()
export class CreateAuditLogTable1735600000000 implements MigrationInterface {
    async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(
            new Table({
                name: "audit_log",
                columns: [
                    {
                        name: "id",
                        type: "integer",
                        isPrimary: true,
                        isGenerated: true,
                        generationStrategy: "increment",
                    },
                    {name: "action", type: "varchar"},
                ],
            }),
        );
    }

    async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable("audit_log");
    }
}
