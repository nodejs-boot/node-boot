import {Service} from "typedi";
import {MessageEnvelop, SqsListener} from "../../src";

@Service()
export class PlaceholderSqsListenerService {
    public receivedMessages: MessageEnvelop[] = [];

    @SqsListener("${app.queue.url}")
    async onMessage(envelop: MessageEnvelop): Promise<void> {
        this.receivedMessages.push(envelop);
    }
}
