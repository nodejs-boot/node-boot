import {HttpError} from "@node-boot/error";

export class HttpException extends HttpError {
    public status: number;

    constructor(status: number, message: string) {
        super(status, message);
        this.status = status;
    }
}
