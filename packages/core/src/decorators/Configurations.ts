export function Configurations(configurationClasses: (new (...args: any[]) => any)[]): Function {
    return function (target: any) {
        configurationClasses.map(ClassConstructor => new ClassConstructor());
    };
}
