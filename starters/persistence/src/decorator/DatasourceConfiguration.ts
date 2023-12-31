import {PersistenceContext} from "../PersistenceContext";
import {NodeBootDataSourceOptions} from "../property/NodeBootDataSourceOptions";

export function DatasourceConfiguration(options: NodeBootDataSourceOptions): ClassDecorator {
    return () => {
        PersistenceContext.get().databaseConnectionOverrides = options;
    };
}
