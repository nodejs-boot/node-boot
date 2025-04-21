import {Logger} from "winston";
import {Service} from "@nodeboot/core";
import {User} from "../persistence";
import {MessageEnvelop, SqsListener} from "@nodeboot/starter-aws";

@Service()
export class GreetingService {
    constructor(private readonly logger: Logger) {}

    public sayHello(user: User): void {
        this.logger.info(`I'm really happy that you exists ${user._id}/${user.email}`);
    }

    @SqsListener("${integrations.aws.sqs.queueUrl}")
    async onMessage(messageEnvelop: MessageEnvelop): Promise<void> {
        this.logger.info("Message received from SQS");
        const msg = JSON.stringify(messageEnvelop.message);
        this.logger.debug(msg);
    }
}
