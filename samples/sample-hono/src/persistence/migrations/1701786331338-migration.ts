import {MigrationInterface, QueryRunner} from "typeorm";
import {Migration} from "@nodeboot/starter-persistence";

@Migration()
export class Migration1701786331338 implements MigrationInterface {
    async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "nb-user" ADD COLUMN "name" varchar(255)`);
    }

    async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "nb-user" DROP COLUMN "name"`);
    }
}
