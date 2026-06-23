/**
 * Demo Application Configuration for Testing Persistence Features
 *
 * This file demonstrates how to set up a Node-Boot application with persistence
 * using the framework's auto-configuration capabilities via @EnableRepositories()
 *
 * Configuration flows:
 * 1. Environment variables (DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME) are read
 * 2. @EnableRepositories() decorator triggers auto-configuration
 * 3. DataSourceConfiguration creates TypeORM DataSource options from config
 * 4. PersistenceConfiguration initializes the DataSource
 *
 * Tests can then access the initialized DataSource from the DI container.
 */
import "reflect-metadata";
import {Container} from "typedi";
import {DataSource} from "typeorm";
import {EnableDI} from "@nodeboot/di";
import {EnableRepositories} from "@nodeboot/starter-persistence";
import {NodeBootApplication, NodeBootApp, NodeBootAppView} from "@nodeboot/core";
import {User} from "./postgres/entities/User.entity";
import {Counter} from "./postgres/entities/Counter.entity";

/**
 * Demo app with persistence enabled
 *
 * The @EnableRepositories() decorator will auto-configure the persistence layer:
 * - Reads configuration from application properties (built from environment)
 * - Initializes DataSource asynchronously
 * - Configures repositories and entity subscribers
 * - Sets up transaction handling
 *
 * Tests should wait for DataSource.isInitialized to be true before using it.
 */
@EnableDI(Container)
@EnableRepositories()
@NodeBootApplication()
export class PersistenceDemoApp implements NodeBootApp {
    async start(): Promise<NodeBootAppView> {
        // At this point, @EnableRepositories() decorators have been processed
        // The DataSource bean is being initialized asynchronously in the background
        // Tests should wait for DataSource.isInitialized === true

        return {
            isReady: true,
            port: 0,
        };
    }

    async stop(): Promise<void> {
        try {
            const dataSource = Container.get(DataSource);
            if (dataSource?.isInitialized) {
                await dataSource.destroy();
            }
        } catch (e) {
            // DataSource might not be initialized if setup failed
        }
    }
}
