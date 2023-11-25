import {Bean, Configuration} from "@node-boot/core";
import {BeansContext} from "@node-boot/context";
import {DataSourceOptions} from "typeorm/data-source/DataSourceOptions";

@Configuration()
export class DataSourceConfiguration {
    @Bean("datasource-config")
    public dataSourceConfig({config}: BeansContext): DataSourceOptions {
        return {
            type: "better-sqlite3",
            database: "express-sample.db",
            synchronize: true, // FIXME create tables automatically through migrations instead of synchronize
        };
    }
}
