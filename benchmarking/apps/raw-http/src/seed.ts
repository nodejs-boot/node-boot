import {AppDataSource} from "./data-source";
import {Todo} from "./entities/Todo";

const SEED_ROWS = 1000;

export async function seedTodos(): Promise<void> {
    const repo = AppDataSource.getRepository(Todo);
    const existing = await repo.count();
    if (existing > 0) return;

    const seed: Partial<Todo>[] = Array.from({length: SEED_ROWS}, (_, i) => ({
        title: `Benchmark todo #${i + 1}`,
        done: (i + 1) % 5 === 0,
    }));
    await repo.save(seed);
}
