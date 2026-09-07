import {Service} from "typedi";
import {MessageEnvelop, SqsListener} from "../../src";

@Service()
export class InvalidUrlSqsListenerService {
    @SqsListener("http://invalid-queue-url/123")
    async onMessage(_envelop: MessageEnvelop): Promise<void> {
        // Should not be registered due to invalid URL
    }
}
