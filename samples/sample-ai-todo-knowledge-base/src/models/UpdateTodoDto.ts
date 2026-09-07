import {IsBoolean, IsIn, IsOptional, IsString, MaxLength} from "class-validator";
import {TodoPriority} from "../persistence";

export class UpdateTodoDto {
    @IsString()
    @IsOptional()
    @MaxLength(200)
    title?: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsBoolean()
    @IsOptional()
    completed?: boolean;

    @IsIn(["low", "medium", "high"])
    @IsOptional()
    priority?: TodoPriority;

    @IsString()
    @IsOptional()
    tags?: string;
}
