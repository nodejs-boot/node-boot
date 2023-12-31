export function Configurations(configurationClasses: (new (...args: any[]) => any)[]): Function {
    return function () {
        configurationClasses.map(ClassConstructor => new ClassConstructor());
    };
}
