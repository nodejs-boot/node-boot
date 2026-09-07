import {IsString} from "class-validator";

export class ChatRequestDto {
    @IsString()
    message: string;

    /**
     * A conversation id unique per user/session, used to keep the chat memory of a
     * conversation isolated from every other conversation. Any stable string works for this
     * demo (e.g. a browser tab id).
     */
    @IsString()
    conversationId: string;
}
