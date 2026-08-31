import {IsInt, IsString, Min, MinLength} from "class-validator";

export class CreateItemDto {
    @IsString()
    @MinLength(2)
    name: string;

    @IsInt()
    @Min(1)
    quantity: number;
}
