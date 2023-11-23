export function Configurations(
  configurationClasses: (new (...args: any[]) => any)[]
): Function {
  return function (target: any) {
    const instances = configurationClasses.map(
      (ClassConstructor) => new ClassConstructor()
    );

    // Use the instances as needed
    console.log("Instances:", instances);
  };
}
