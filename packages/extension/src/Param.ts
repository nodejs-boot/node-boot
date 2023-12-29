import {Optional} from "./Optional";
import {OfParamMetadata} from "./types";

/**
 *
 * @author Manuel Santos <ney.br.santos@gmail.com>
 * */
export class Param {
    static ofString(
        value: string | undefined | null,
        paramMetadata: OfParamMetadata,
    ): Optional<number | boolean | Date | string | undefined> {
        if (value === null || value === undefined) {
            return Optional.empty();
        }
        switch (paramMetadata.targetName) {
            case "number":
                return Param.ofNumber(value);
            case "boolean":
                return Param.ofBoolean(value);
            case "date":
                return Param.ofDate(value);
            case "string":
            default:
                return Optional.of(value);
        }
    }

    static ofNumber(value: string): Optional<number | undefined> {
        if (value === "") {
            return Optional.empty();
        }
        const valueNumber = +value;
        if (Number.isNaN(valueNumber)) {
            return Optional.empty();
        }
        return Optional.of(valueNumber);
    }

    static ofBoolean(value: string): Optional<boolean | undefined> {
        if (value === "true" || value === "1" || value === "") {
            return Optional.of(true);
        } else if (value === "false" || value === "0") {
            return Optional.of(false);
        } else {
            return Optional.empty();
        }
    }

    static ofDate(value: string): Optional<Date | undefined> {
        const parsedDate = new Date(value);
        if (Number.isNaN(parsedDate.getTime())) {
            return Optional.empty();
        }
        return Optional.of(parsedDate);
    }
}
