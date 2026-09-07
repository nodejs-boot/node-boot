import {Service} from "@nodeboot/core";
import {Scheduler} from "../../src";

@Service()
export class DisabledCounterService {
    runCount = 0;

    @Scheduler("*/1 * * * * *")
    tick() {
        this.runCount++;
    }
}
