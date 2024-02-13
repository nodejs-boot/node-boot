/**
 * Runs given callback that returns promise for each item in the given collection in order.
 * Operations executed after each other, right after previous promise being resolved.
 */
export async function runInSequence<T, U>(collection: T[], callback: (item: T) => Promise<U>): Promise<U[]> {
    const results: U[] = [];
    await collection.reduce(async (promise, item) => {
        return promise
            .then(() => {
                return callback(item);
            })
            .then(result => {
                results.push(result);
            });
    }, Promise.resolve());
    return results;
}
