import {AxiosRequestConfig} from "axios";

export const HTTP_CLIENT_FEATURE = Symbol("HTTP-Client-Feature");

export interface HttpClientConfig extends AxiosRequestConfig {
    httpLogging?: boolean;
}
