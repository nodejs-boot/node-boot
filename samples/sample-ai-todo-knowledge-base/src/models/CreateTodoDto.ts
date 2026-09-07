import {IsIn, IsNotEmpty, IsOptional, IsString, MaxLength} from "class-validator";
import {TodoPriority} from "../persistence";

export class CreateTodoDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(200)
    title: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsIn(["low", "medium", "high"])
    @IsOptional()
    priority?: TodoPriority;

    @IsString()
    @IsOptional()
    tags?: string;
}
