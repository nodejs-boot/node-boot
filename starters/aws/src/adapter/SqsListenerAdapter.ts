import {
    ApplicationContext,
    ApplicationFeatureAdapter,
    ApplicationFeatureContext,
    extractPlaceholderKey,
} from "@nodeboot/context";
import {AWS_SQS_FEATURE} from "../types";
import {SQSClient} from "@aws-sdk/client-sqs";
import {Consumer} from "sqs-consumer";

type SqsListenerOptions = {
    target: any;
    listenerFunction: Function;
    queueUrlOrConfigPlaceholder: string;
};

const SQS_URL_PATTERN =
    /^https:\/\/sqs\.(?<region>[a-z0-9-]+)\.amazonaws\.com\/(?<accountId>\d{12})\/(?<queueName>[a-zA-Z0-9_-]+)$/;

export class SqsListenerAdapter implements ApplicationFeatureAdapter {
    private readonly options: SqsListenerOptions;

    constructor(options: SqsListenerOptions) {
        this.options = options;
    }

    private isValidSqsUrl(url: string): boolean {
        return SQS_URL_PATTERN.test(url);
    }

    private getQueueUrl(config: any, queueUrlOrConfigPlaceholder: string) {
        const configPlaceholder = extractPlaceholderKey(queueUrlOrConfigPlaceholder);
        if (configPlaceholder) {
            return config.getString(configPlaceholder);
        } else {
            return queueUrlOrConfigPlaceholder;
        }
    }

    bind({logger, iocContainer, config}: ApplicationFeatureContext): void {
        const {target, queueUrlOrConfigPlaceholder, listenerFunction} = this.options;

        // Check if SQS feature is enabled
        if (ApplicationContext.get().applicationFeatures[AWS_SQS_FEATURE]) {
            // Retrieve the class instance (bean) from the DI container
            const componentBean = iocContainer.get(target.constructor);

            const queueUrl = this.getQueueUrl(config, queueUrlOrConfigPlaceholder);

            // Validate SQS Queue url
            if (this.isValidSqsUrl(queueUrl)) {
                logger.info(
                    `Registering SQS Listener "${queueUrl}" --> "${target.constructor.name}:::${listenerFunction.name}()"`,
                );

                const sqsClient = iocContainer.get(SQSClient);

                const app = Consumer.create({
                    queueUrl: queueUrl,
                    handleMessage: async message => {
                        listenerFunction.apply(componentBean, message);
                    },
                    sqs: sqsClient,
                });

                app.on("error", err => {
                    logger.error(`SQS Generic Error: ${err.message}`);
                });

                app.on("processing_error", err => {
                    logger.error(`SQS Processing Error: ${err.message}`);
                });

                app.on("timeout_error", err => {
                    logger.error(`SQS Timeout Error: ${err.message}`);
                });

                app.start();
            } else {
                logger.warn(`Invalid SQS queue URL for @SqsListener at function  "${target.constructor.name}:::${listenerFunction.name}()".
                 Please provide a valid URL in the format "https://sqs.aws-region.amazonaws.com/account-id/queue-name"`);
            }
        } else {
            logger.warn(`⏰ SqsListener ${target.constructor.name}:::${listenerFunction.name}() with queueUrl ${queueUrlOrConfigPlaceholder} 
            registered but AWS SQS is disabled. To enable AWS SQS, please decorate your Node-Boot application 
            class with @EnableAws() and provide SQS region the configuration at "integrations.aws.sqs.region" config path.`);
        }
    }
}
