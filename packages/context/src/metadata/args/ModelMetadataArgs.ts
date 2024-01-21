/**
 * @Model metadata used to storage metadata about registered data classes.
 */
export interface ModelMetadataArgs {
    /**
     * Indicates class which is declared as a data-class.
     */
    target: Function;
}
