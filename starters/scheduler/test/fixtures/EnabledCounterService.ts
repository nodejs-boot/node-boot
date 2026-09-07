import {Service} from "@nodeboot/core";
import {Scheduler} from "../../src";

@Service()
export class EnabledCounterService {
    runCount = 0;

    @Scheduler("*/1 * * * * *")
    tick() {
        this.runCount++;
    }
}
