import {DefaultNamingStrategy, NamingStrategyInterface} from "typeorm";
import {PersistenceNamingStrategy} from "../../src";

/**
 * Prefixes every table name with `nb_` unless a `@Entity("customName")` override is given -
 * proof this took effect is the real sqlite schema having a `nb_product` table, not `product`.
 */
@PersistenceNamingStrategy()
export class ProductNamingStrategy extends DefaultNamingStrategy implements NamingStrategyInterface {
    override tableName(className: string, customName: string): string {
        return customName ? customName : `nb_${className.toLowerCase()}`;
    }
}
