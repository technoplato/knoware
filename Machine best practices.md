Machine best practices

1) Name your actions and declare them in setup with their implementation

2) Organize your files in a structure like the following
    <domain> name (permissions, application lifecycle, etc)
    ├── <domain>.machine.ts
    ├── <domain>.types.ts
    ├── <domain>.actions.ts
    ├── <domain>.actors.ts