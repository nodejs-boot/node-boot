export type ComponentOptions = {
    /**
     * Indicates if this component must be global and same instance must be used across all containers.
     */
    global?: boolean;
    /**
     * Indicates whether a new instance of this class must be created for each class injecting this class.
     * Global option is ignored when this option is used.
     */
    transient?: boolean;
    /**
     * Allows to setup multiple instances the different classes under a single component id string or token.
     */
    multiple?: boolean;
    /**
     * Indicates whether a new instance should be created as soon as the class is registered.
     * By default the registered classes are only instantiated when they are requested from the container.
     */
    eager?: boolean;
};
