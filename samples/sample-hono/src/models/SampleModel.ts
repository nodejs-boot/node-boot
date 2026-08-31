import {Model, Property} from "@nodeboot/core";
import {IsDateString, IsNotEmpty, IsObject} from "class-validator";
import {JsonObject} from "@nodeboot/context";
import {DateTime} from "luxon";

@Model()
export class SampleModel {
    @Property({required: true, description: "Entity reference that this fact relates to"})
    @IsNotEmpty()
    entityRef: string;

    @Property({required: false, description: "System reference that this fact relates to"})
    systemRef?: string;

    @Property({
        required: false,
        description:
            "Reference of the repository where the data is hosted (ex: GitHub repo - repository:org-name/repo-name)",
    })
    repoRef?: string;

    @Property({
        required: false,
        description:
            "Optional reference to the owner of the fact, which can be used to indicate ownership of the fact. This is typically a user or team identifier.",
    })
    ownerRef?: string;

    @Property({
        required: false,
        description:
            "Optional account identifier which can be used to scope the fact to a specific account context. This is useful in multi-tenant scenarios where facts need to be associated with particular accounts.",
    })
    accountRef?: string;

    @Property({
        required: true,
        description:
            "A collection of fact values as key value pairs. Key indicates fact name as it is defined in FactSchema",
    })
    @IsObject()
    @IsNotEmpty()
    data: JsonObject;

    @Property({
        required: false,
        description:
            "Optional timestamp value which can be used to override retrieval time of the fact row. Otherwise when stored into data storage, defaults to current time",
    })
    @IsDateString()
    timestamp?: DateTime;
}
