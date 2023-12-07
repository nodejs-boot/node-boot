import {PersistenceContext} from "../PersistenceContext";
import {NodeBootDataSourceOptions} from "../property/NodeBootDataSourceOptions";

export function DatasourceConfiguration(options: NodeBootDataSourceOptions): ClassDecorator {
    return (target: Function) => {
        PersistenceContext.get().databaseConnectionOverrides = options;
    };
}
