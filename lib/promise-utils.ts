export const promiseTimeout = <T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> => {
    let timeoutId: NodeJS.Timeout;
    const timeoutPromise = new Promise<T>((resolve) => {
        timeoutId = setTimeout(() => {
            console.warn(`[PromiseTimeout] Timed out after ${ms}ms`);
            resolve(fallback);
        }, ms);
    });

    return Promise.race([
        promise.then((res) => {
            clearTimeout(timeoutId);
            return res;
        }),
        timeoutPromise
    ]);
};
