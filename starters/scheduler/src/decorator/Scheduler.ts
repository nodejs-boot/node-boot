import {ApplicationContext} from "@nodeboot/context";
import {SchedulerAdapter} from "../adapter";
import {SCHEDULING_FEATURE} from "../types";

export function Scheduler(cronExpression: string): MethodDecorator {
    return function (target: any, _: string | symbol, descriptor: PropertyDescriptor) {
        // Only register Scheduling if the scheduling feature iis enabled
        if (ApplicationContext.get().applicationFeatures[SCHEDULING_FEATURE]) {
            const schedulerAdapter = new SchedulerAdapter({
                target,
                cronExpression,
                cronFunction: descriptor.value,
            });
            ApplicationContext.get().applicationFeatureAdapters.push(schedulerAdapter);
        }
    };
}
