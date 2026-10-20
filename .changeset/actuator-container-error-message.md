---
"@nodeboot/starter-actuator": patch
---

The error thrown when the actuator cannot find an IoC container no longer tells you to add `@EnableDI(Container)`, since a default container is always available.
