import {ApplicationContext} from "@nodeboot/context";
import {SchedulerAdapter} from "../adapter";

export function Scheduler(cronExpression: string): MethodDecorator {
    return function (target: any, _: string | symbol, descriptor: PropertyDescriptor) {
        const schedulerAdapter = new SchedulerAdapter({
            target,
            cronExpression,
            cronFunction: descriptor.value,
        });
        ApplicationContext.get().applicationFeatureAdapters.push(schedulerAdapter);
    };
}
