import {HttpClientConfig} from "../client";
import {ApplicationContext} from "@nodeboot/context";
import {HttpClientAdapter} from "../adapter";

export function HttpClient(config: HttpClientConfig = {httpLogging: true}): ClassDecorator {
    return function (target: any) {
        const schedulerAdapter = new HttpClientAdapter(target, config);
        ApplicationContext.get().applicationFeatureAdapters.push(schedulerAdapter);
    };
}
