import {DefaultNamingStrategy} from "typeorm";
import {PersistenceNamingStrategy} from "@nodeboot/starter-persistence";

@PersistenceNamingStrategy()
export class CustomNamingStrategy extends DefaultNamingStrategy {
    name = "sample-naming-strategy";

    override tableName(targetName: string, userSpecifiedName: string | undefined): string {
        return `nb-${super.tableName(targetName, userSpecifiedName)}`;
    }
}
