import {Hook} from "./Hook";
import {jest} from "@jest/globals";

// TimeControl class handles the manipulation of Jest's timers
class TimeControl {
    /**
     * Advances time by the specified number of milliseconds.
     * @param ms The number of milliseconds to advance.
     */
    advanceTimeBy(ms: number) {
        jest.advanceTimersByTime(ms);
    }

    /**
     * Runs all pending timers.
     */
    runAllTimers() {
        jest.runAllTimers();
    }
}

// TimeTracking class handles the actual time tracking (start, stop, and calculate elapsed time)
class TimeTracking {
    private startTime?: number = undefined;
    private endTime?: number = undefined;

    constructor(private readonly hook: TimerHook) {}

    /**
     * Starts the time tracking.
     */
    start() {
        this.startTime = Date.now();
    }

    /**
     * Stops the time tracking and calculates the elapsed time.
     */
    stop() {
        if (!this.startTime) {
            throw new Error("Time tracking was not started.");
        }
        this.endTime = Date.now();
        this.hook.clear(this);
    }

    /**
     * Calculates the elapsed time (in milliseconds) between start and stop.
     * @returns The elapsed time in milliseconds.
     */
    calculateElapsedTime(): number {
        if (!this.startTime) {
            throw new Error("Invalid Time tracking instance");
        }
        if (!this.endTime) {
            this.stop();
        }
        return (this.endTime ?? 0) - (this.startTime ?? 0);
    }
}

/**
 * The `TimerHook` class integrates Jest's fake timer functionality into the NodeBoot lifecycle.
 * This allows controlling timers like `setTimeout` and `setInterval` during tests, and tracking time manually when needed.
 */
export class TimerHook extends Hook {
    private timeControl: TimeControl = new TimeControl();
    private timeTrackingInstances: TimeTracking[] = [];

    /**
     * Set up Jest's fake timers before the tests begin.
     */
    override beforeTests() {
        jest.useFakeTimers();
    }

    /**
     * Reset to real timers after the tests finish.
     */
    override afterTests() {
        jest.useRealTimers();
    }

    /**
     * Returns both time control and tracking utilities as an object.
     * Each time `use()` is called, it provides a shared instance of TimeControl and a new TimeTracking instance.
     * @returns An object with `control` and `tracking` properties.
     */
    use() {
        return {
            control: () => this.timeControl,
            tracking: () => this.startTracking(),
        };
    }

    /**
     * Reset internal state (time tracking instances) after each test to avoid interference with other tests.
     */
    clear(trackingInstance: TimeTracking) {
        const index = this.timeTrackingInstances.indexOf(trackingInstance);
        if (index > -1) {
            this.timeTrackingInstances.splice(index, 1);
        }
    }

    /**
     * Starts a new time tracking instance.
     * This ensures each call to `start()` gets a new, independent tracking instance.
     */
    private startTracking() {
        const newTracking = new TimeTracking(this);
        newTracking.start(); // Start the time tracking immediately
        this.timeTrackingInstances.push(newTracking); // Keep track of instances for potential future resets
        return newTracking;
    }
}
