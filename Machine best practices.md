Machine best practices

1) Name your actions and declare them in setup with their implementation

2) Organize your files in a structure like the following
    <domain> name (permissions, application lifecycle, etc)
    ├── <domain>.machine.ts
    ├── <domain>.types.ts
    ├── <domain>.actions.ts
    ├── <domain>.actors.ts

3) Should we have every actor declared in a system???
  - PROS
    - system.get works
    - everything is explicit
    - you can simulate everything in that actor system headlessly
  - CONS
    - Complexity...

4) Should we use emit?
I don't think so, because it causes implicit dependencies at the cost of convenience
