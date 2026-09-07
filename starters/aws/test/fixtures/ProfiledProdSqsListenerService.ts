import {Service} from "typedi";
import {Profile} from "@nodeboot/context";
import {MessageEnvelop, SqsListener} from "../../src";

@Profile(["prod"])
@Service()
export class ProfiledProdSqsListenerService {
    public receivedMessages: MessageEnvelop[] = [];

    @SqsListener("https://sqs.us-east-1.amazonaws.com/123456789012/prod-queue")
    async onMessage(envelop: MessageEnvelop): Promise<void> {
        this.receivedMessages.push(envelop);
    }
}
