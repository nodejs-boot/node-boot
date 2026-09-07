import {Service} from "@nodeboot/core";
import {NotFoundError} from "@nodeboot/error";
import {Logger} from "winston";
import {Todo, TodoRepository} from "../persistence";
import {CreateTodoDto, UpdateTodoDto} from "../models";

/**
 * Plain CRUD service for Todos. Kept free of any AI concern on purpose — the AI layer
 * (`TodoToolsService`, `AiKnowledgeBaseService`) is built strictly on top of this service, the
 * same way a REST controller would be, so the knowledge base never bypasses business rules.
 */
@Service()
export class TodoService {
    constructor(private readonly logger: Logger, private readonly todoRepository: TodoRepository) {}

    async list(onlyPending = false): Promise<Todo[]> {
        const todos = onlyPending
            ? await this.todoRepository.findBy({completed: false})
            : await this.todoRepository.find();
        return todos.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }

    async findById(id: number): Promise<Todo> {
        const todo = await this.todoRepository.findOneBy({id});
        if (!todo) {
            throw new NotFoundError(`Todo ${id} doesn't exist`);
        }
        return todo;
    }

    async create(data: CreateTodoDto): Promise<Todo> {
        this.logger.info(`Creating todo: ${data.title}`);
        return this.todoRepository.save({
            title: data.title,
            description: data.description,
            priority: data.priority ?? "medium",
            tags: data.tags,
            completed: false,
        });
    }

    async update(id: number, data: UpdateTodoDto): Promise<Todo> {
        const todo = await this.findById(id);
        return this.todoRepository.save({...todo, ...data});
    }

    async complete(id: number): Promise<Todo> {
        return this.update(id, {completed: true});
    }

    async delete(id: number): Promise<void> {
        await this.findById(id);
        await this.todoRepository.delete({id});
    }

    async search(query: string): Promise<Todo[]> {
        this.logger.info(`Searching todos matching: ${query}`);
        return this.todoRepository.search(query);
    }
}
