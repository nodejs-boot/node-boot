import {Repository} from "typeorm";
import {DataRepository} from "../../src";
import {AuditLog} from "./AuditLog.entity";

@DataRepository(AuditLog)
export class AuditLogRepository extends Repository<AuditLog> {}
