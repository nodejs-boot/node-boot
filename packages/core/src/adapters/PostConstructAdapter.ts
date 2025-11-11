import {
    allowedProfiles,
    ApplicationFeatureAdapter,
    ApplicationFeatureContext,
    getActiveProfiles,
    Lifecycle,
} from "@nodeboot/context";

type PostConstructOptions = {
    target: any;
    postConstructFunction: Function;
};

/**
 * PostConstructAdaptor integrates post-construction initialization into a Node-Boot application.
 * It acts as an adapter to execute methods decorated with `@PostConstruct` after the application has started.
 * This adapter ensures that post-construction methods are executed
 * based on the application's lifecycle.
 *
 * @author Manuel Santos <ney.br.santos@gmail.com>
 */
@Lifecycle("persistence.started")
export class PostConstructAdaptor implements ApplicationFeatureAdapter {
    private readonly options: PostConstructOptions;

    /**
     * Constructs a PostConstructAdaptor instance.
     *
     * @param {PostConstructOptions} options - The configuration options for the post construct.
     */
    constructor(options: PostConstructOptions) {
        this.options = options;
    }

    /**
     * Binds the post-construct method to the application lifecycle.
     * Retrieves the associated bean from the dependency injection (DI) container,
     * and executes the post-construct function if the active profiles match.
     *
     * @param {ApplicationFeatureContext} context - The application context containing logger and IoC container.
     */
    async bind({logger, iocContainer}: ApplicationFeatureContext): Promise<void> {
        const {target, postConstructFunction} = this.options;

        if (allowedProfiles(target)) {
            // Retrieve the class instance (bean) from the DI container
            const componentBean = iocContainer.get(target.constructor);
            logger.info(`Executing @PostConstruct for ${target.constructor.name}`);
            await postConstructFunction.apply(componentBean);
            logger.info(`@PostConstruct for ${target.constructor.name} executed successfully.`);
        } else {
            logger.info(
                `Skipping @PostConstruct execution for ${
                    target.constructor.name
                } due to active profiles: [${getActiveProfiles().join(", ")}] not matching allowed profiles.`,
            );
        }
    }
}
