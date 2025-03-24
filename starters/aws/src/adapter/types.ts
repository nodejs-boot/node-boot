import {JsonObject} from "@nodeboot/context";

export type MessageEnvelop<M = JsonObject> = {
    messageId: string;
    timestamp: string;
    signature: string;
    message: M;
};
