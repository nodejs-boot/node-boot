import "@nodeboot/context";
import {describe, it} from "node:test";
import assert from "node:assert/strict";
import {Injector} from "@nonnajs/di";
import {NonnaContainerAdapter} from "../src/ioc/NonnaContainerAdapter";
import {Inject} from "../src/decorators/Inject";
import {decorateDi} from "../src/ioc/makeDiDecoration";

describe("late-bound tokens", () => {
    class LateRepository {
        constructor(readonly label = "placeholder") {}
    }

    class LateConsumer {
        constructor(@Inject(LateRepository) readonly repository: LateRepository) {}
    }
    decorateDi(LateConsumer);

    it("passes graph validation, then resolves the value bound later", async () => {
        const container = new NonnaContainerAdapter(
            Injector.create(),
            () => [],
            () => [LateRepository],
        );

        await container.initialize();
        container.set(LateRepository, new LateRepository("real"));

        assert.equal(container.get(LateConsumer).repository.label, "real");
    });

    it("fails graph validation without the late-bound declaration", async () => {
        const container = new NonnaContainerAdapter(Injector.create());

        await assert.rejects(container.initialize(), /LateRepository/);
    });
});
