import {
  PromiseActorLogic,
  SpecialTargets,
  StateValue,
  assign,
  createActor,
  createMachine,
  forwardTo,
  fromCallback,
  fromPromise,
  raise,
  sendParent,
  sendTo,
} from 'xstate';

const user = { name: 'David' };

describe('invoke', () => {
  it('should be possible to send immediate events to initially invoked actors', () => {
    const child = createMachine({
      on: {
        PING: {
          actions: sendParent({ type: 'PONG' }),
        },
      },
    });

    const machine = createMachine({
      initial: 'waiting',
      states: {
        waiting: {
          invoke: {
            id: 'ponger',
            src: child,
          },
          // entry: sendTo('ponger', { type: 'PING' }),
          on: {
            PONG: 'done',
            sendPing: {
              actions: sendTo('ponger', { type: 'PING' }),
            },
          },
        },
        done: {
          type: 'final',
        },
      },
    });

    const service = createActor(machine).start();
    service.send({ type: 'sendPing' });

    expect(service.getSnapshot().value).toBe('done');
  });

  it('child can immediately respond to the parent with multiple events', () => {
    const childMachine = createMachine({
      types: {} as {
        events: { type: 'FORWARD_DEC' };
      },
      id: 'child',
      initial: 'init',
      states: {
        init: {
          on: {
            FORWARD_DEC: {
              actions: [
                sendParent({ type: 'DEC' }),
                sendParent({ type: 'DEC' }),
                sendParent({ type: 'DEC' }),
              ],
            },
          },
        },
      },
    });

    const someParentMachine = createMachine(
      {
        id: 'parent',
        types: {} as {
          context: { count: number };
          actors: {
            src: 'child';
            id: 'someService';
            logic: typeof childMachine;
          };
        },
        context: { count: 0 },
        initial: 'start',
        states: {
          start: {
            invoke: {
              src: 'child',
              id: 'someService',
            },
            always: {
              target: 'stop',
              guard: ({ context }) => context.count === -3,
            },
            on: {
              DEC: {
                actions: assign({ count: ({ context }) => context.count - 1 }),
              },
              FORWARD_DEC: {
                actions: sendTo('someService', { type: 'FORWARD_DEC' }),
              },
            },
          },
          stop: {
            type: 'final',
          },
        },
      },
      {
        actors: {
          child: childMachine,
        },
      }
    );

    const actorRef = createActor(someParentMachine).start();
    actorRef.send({ type: 'FORWARD_DEC' });

    // 1. The 'parent' machine will not do anything (inert transition)
    // 2. The 'FORWARD_DEC' event will be "forwarded" to the child machine
    // 3. On the child machine, the 'FORWARD_DEC' event sends the 'DEC' action to the parent thrice
    // 4. The context of the 'parent' machine will be updated from 0 to -3
    expect(actorRef.getSnapshot().context).toEqual({ count: -3 });
  });

  it('should start services (explicit machine, invoke = config)', (done) => {
    const childMachine = createMachine({
      id: 'fetch',
      types: {} as {
        context: { userId: string | undefined; user?: typeof user | undefined };
        events: {
          type: 'RESOLVE';
          user: typeof user;
        };
        input: { userId: string };
      },
      context: ({ input }) => ({
        userId: input.userId,
      }),
      initial: 'pending',
      states: {
        pending: {
          entry: raise({ type: 'RESOLVE', user }),
          on: {
            RESOLVE: {
              target: 'success',
              guard: ({ context }) => {
                return context.userId !== undefined;
              },
            },
          },
        },
        success: {
          type: 'final',
          entry: assign({
            user: ({ event }) => event.user,
          }),
        },
        failure: {
          entry: sendParent({ type: 'REJECT' }),
        },
      },
      output: ({ context }) => ({ user: context.user }),
    });

    const machine = createMachine({
      types: {} as {
        context: {
          selectedUserId: string;
          user?: typeof user;
        };
      },
      id: 'fetcher',
      initial: 'idle',
      context: {
        selectedUserId: '42',
        user: undefined,
      },
      states: {
        idle: {
          on: {
            GO_TO_WAITING: 'waiting',
          },
        },
        waiting: {
          invoke: {
            src: childMachine,
            input: ({ context }: any) => ({
              userId: context.selectedUserId,
            }),
            onDone: {
              target: 'received',
              guard: ({ event }) => {
                // Should receive { user: { name: 'David' } } as event data
                return (event.output as any).user.name === 'David';
              },
            },
          },
        },
        received: {
          type: 'final',
        },
      },
    });

    const actor = createActor(machine);
    actor.subscribe({
      complete: () => {
        done();
      },
    });
    actor.start();
    actor.send({ type: 'GO_TO_WAITING' });
  });

  it('should start services (explicit machine, invoke = machine)', (done) => {
    const childMachine = createMachine({
      types: {} as {
        events: { type: 'RESOLVE' };
        input: { userId: string };
      },
      initial: 'pending',
      states: {
        pending: {
          entry: raise({ type: 'RESOLVE' }),
          on: {
            RESOLVE: {
              target: 'success',
            },
          },
        },
        success: {
          type: 'final',
        },
      },
    });

    const machine = createMachine({
      initial: 'idle',
      states: {
        idle: {
          on: {
            GO_TO_WAITING: 'waiting',
          },
        },
        waiting: {
          invoke: {
            src: childMachine,
            onDone: 'received',
          },
        },
        received: {
          type: 'final',
        },
      },
    });
    const actor = createActor(machine);
    actor.subscribe({
      complete: () => {
        done();
      },
    });
    actor.start();
    actor.send({ type: 'GO_TO_WAITING' });
  });

  it('should start services (machine as invoke config)', (done) => {
    const machineInvokeMachine = createMachine({
      types: {} as {
        events: {
          type: 'SUCCESS';
          data: number;
        };
      },
      id: 'machine-invoke',
      initial: 'pending',
      states: {
        pending: {
          invoke: {
            src: createMachine({
              id: 'child',
              initial: 'sending',
              states: {
                sending: {
                  entry: sendParent({ type: 'SUCCESS', data: 42 }),
                },
              },
            }),
          },
          on: {
            SUCCESS: {
              target: 'success',
              guard: ({ event }) => {
                return event.data === 42;
              },
            },
          },
        },
        success: {
          type: 'final',
        },
      },
    });
    const actor = createActor(machineInvokeMachine);
    actor.subscribe({ complete: () => done() });
    actor.start();
  });

  it('should start deeply nested service (machine as invoke config)', (done) => {
    const machineInvokeMachine = createMachine({
      types: {} as {
        events: {
          type: 'SUCCESS';
          data: number;
        };
      },
      id: 'parent',
      initial: 'a',
      states: {
        a: {
          initial: 'b',
          states: {
            b: {
              invoke: {
                src: createMachine({
                  id: 'child',
                  initial: 'sending',
                  states: {
                    sending: {
                      entry: sendParent({ type: 'SUCCESS', data: 42 }),
                    },
                  },
                }),
              },
            },
          },
        },
        success: {
          id: 'success',
          type: 'final',
        },
      },
      on: {
        SUCCESS: {
          target: '.success',
          guard: ({ event }) => {
            return event.data === 42;
          },
        },
      },
    });
    const actor = createActor(machineInvokeMachine);
    actor.subscribe({ complete: () => done() });
    actor.start();
  });

  it('should use the service overwritten by .provide(...)', (done) => {
    const childMachine = createMachine({
      id: 'child',
      initial: 'init',
      states: {
        init: {},
      },
    });

    const someParentMachine = createMachine(
      {
        id: 'parent',
        types: {} as {
          context: { count: number };
          actors: {
            src: 'child';
            id: 'someService';
            logic: typeof childMachine;
          };
        },
        context: { count: 0 },
        initial: 'start',
        states: {
          start: {
            invoke: {
              src: 'child',
              id: 'someService',
            },
            on: {
              STOP: 'stop',
            },
          },
          stop: {
            type: 'final',
          },
        },
      },
      {
        actors: {
          child: childMachine,
        },
      }
    );

    const actor = createActor(
      someParentMachine.provide({
        actors: {
          child: createMachine({
            id: 'child',
            initial: 'init',
            states: {
              init: {
                entry: [sendParent({ type: 'STOP' })],
              },
            },
          }),
        },
      })
    );
    actor.subscribe({
      complete: () => {
        done();
      },
    });
    actor.start();
  });

  describe('parent to child', () => {
    const subMachine = createMachine({
      id: 'child',
      initial: 'one',
      states: {
        one: {
          on: { NEXT: 'two' },
        },
        two: {
          entry: sendParent({ type: 'NEXT' }),
        },
      },
    });

    it('should communicate with the child machine (invoke on machine)', (done) => {
      const mainMachine = createMachine({
        id: 'parent',
        initial: 'one',
        invoke: {
          id: 'foo-child',
          src: subMachine,
        },
        states: {
          one: {
            entry: sendTo('foo-child', { type: 'NEXT' }),
            on: { NEXT: 'two' },
          },
          two: {
            type: 'final',
          },
        },
      });

      const actor = createActor(mainMachine);
      actor.subscribe({
        complete: () => {
          done();
        },
      });
      actor.start();
    });

    it('should communicate with the child machine (invoke on state)', (done) => {
      const mainMachine = createMachine({
        id: 'parent',
        initial: 'one',
        states: {
          one: {
            invoke: {
              id: 'foo-child',
              src: subMachine,
            },
            entry: sendTo('foo-child', { type: 'NEXT' }),
            on: { NEXT: 'two' },
          },
          two: {
            type: 'final',
          },
        },
      });

      const actor = createActor(mainMachine);
      actor.subscribe({
        complete: () => {
          done();
        },
      });
      actor.start();
    });

    it('should transition correctly if child invocation causes it to directly go to final state', () => {
      const doneSubMachine = createMachine({
        id: 'child',
        initial: 'one',
        states: {
          one: {
            on: { NEXT: 'two' },
          },
          two: {
            type: 'final',
          },
        },
      });

      const mainMachine = createMachine({
        id: 'parent',
        initial: 'one',
        states: {
          one: {
            invoke: {
              id: 'foo-child',
              src: doneSubMachine,
              onDone: 'two',
            },
            entry: sendTo('foo-child', { type: 'NEXT' }),
          },
          two: {
            on: { NEXT: 'three' },
          },
          three: {
            type: 'final',
          },
        },
      });

      const actor = createActor(mainMachine).start();

      expect(actor.getSnapshot().value).toBe('two');
    });

    it('should work with invocations defined in orthogonal state nodes', (done) => {
      const pongMachine = createMachine({
        id: 'pong',
        initial: 'active',
        states: {
          active: {
            type: 'final',
          },
        },
        output: { secret: 'pingpong' },
      });

      const pingMachine = createMachine({
        id: 'ping',
        type: 'parallel',
        states: {
          one: {
            initial: 'active',
            states: {
              active: {
                invoke: {
                  id: 'pong',
                  src: pongMachine,
                  onDone: {
                    target: 'success',
                    guard: ({ event }) => event.output.secret === 'pingpong',
                  },
                },
              },
              success: {
                type: 'final',
              },
            },
          },
        },
      });

      const actor = createActor(pingMachine);
      actor.subscribe({
        complete: () => {
          done();
        },
      });
      actor.start();
    });

    it('should not reinvoke root-level invocations on root non-reentering transitions', () => {
      // https://github.com/statelyai/xstate/issues/2147

      let invokeCount = 0;
      let invokeDisposeCount = 0;
      let actionsCount = 0;
      let entryActionsCount = 0;

      const machine = createMachine({
        invoke: {
          src: fromCallback(() => {
            invokeCount++;

            return () => {
              invokeDisposeCount++;
            };
          }),
        },
        entry: () => entryActionsCount++,
        on: {
          UPDATE: {
            actions: () => {
              actionsCount++;
            },
          },
        },
      });

      const service = createActor(machine).start();
      expect(entryActionsCount).toEqual(1);
      expect(invokeCount).toEqual(1);
      expect(invokeDisposeCount).toEqual(0);
      expect(actionsCount).toEqual(0);

      service.send({ type: 'UPDATE' });
      expect(entryActionsCount).toEqual(1);
      expect(invokeCount).toEqual(1);
      expect(invokeDisposeCount).toEqual(0);
      expect(actionsCount).toEqual(1);

      service.send({ type: 'UPDATE' });
      expect(entryActionsCount).toEqual(1);
      expect(invokeCount).toEqual(1);
      expect(invokeDisposeCount).toEqual(0);
      expect(actionsCount).toEqual(2);
    });

    it('should stop a child actor when reaching a final state', () => {
      let actorStopped = false;

      const machine = createMachine({
        id: 'machine',
        invoke: {
          src: fromCallback(() => () => (actorStopped = true)),
        },
        initial: 'running',
        states: {
          running: {
            on: {
              finished: 'complete',
            },
          },
          complete: { type: 'final' },
        },
      });

      const service = createActor(machine).start();

      service.send({
        type: 'finished',
      });

      expect(actorStopped).toBe(true);
    });

    it('child should not invoke an actor when it transitions to an invoking state when it gets stopped by its parent', (done) => {
      let invokeCount = 0;

      const child = createMachine({
        id: 'child',
        initial: 'idle',
        states: {
          idle: {
            invoke: {
              src: fromCallback(({ sendBack }) => {
                invokeCount++;

                if (invokeCount > 1) {
                  // prevent a potential infinite loop
                  throw new Error('This should be impossible.');
                }

                // it's important for this test to send the event back when the parent is *not* currently processing an event
                // this ensures that the parent can process the received event immediately and can stop the child immediately
                setTimeout(() => sendBack({ type: 'STARTED' }));
              }),
            },
            on: {
              STARTED: 'active',
            },
          },
          active: {
            invoke: {
              src: fromCallback(({ sendBack }) => {
                sendBack({ type: 'STOPPED' });
              }),
            },
            on: {
              STOPPED: {
                target: 'idle',
                actions: forwardTo(SpecialTargets.Parent),
              },
            },
          },
        },
      });
      const parent = createMachine({
        id: 'parent',
        initial: 'idle',
        states: {
          idle: {
            on: {
              START: 'active',
            },
          },
          active: {
            invoke: { src: child },
            on: {
              STOPPED: 'done',
            },
          },
          done: {
            type: 'final',
          },
        },
      });

      const service = createActor(parent);
      service.subscribe({
        complete: () => {
          expect(invokeCount).toBe(1);
          done();
        },
      });
      service.start();

      service.send({ type: 'START' });
    });
  });

  type PromiseExecutor = (
    resolve: (value?: any) => void,
    reject: (reason?: any) => void
  ) => void;

  const promiseTypes = [
    {
      type: 'Promise',
      createPromise(executor: PromiseExecutor): Promise<any> {
        return new Promise(executor);
      },
    },
    {
      type: 'PromiseLike',
      createPromise(executor: PromiseExecutor): PromiseLike<any> {
        // Simulate a Promise/A+ thenable / polyfilled Promise.
        function createThenable(promise: Promise<any>): PromiseLike<any> {
          return {
            then(onfulfilled, onrejected) {
              return createThenable(promise.then(onfulfilled, onrejected));
            },
          };
        }
        return createThenable(new Promise(executor));
      },
    },
  ];

  promiseTypes.forEach(({ type, createPromise }) => {
    describe(`with promises (${type})`, () => {
      const invokePromiseMachine = createMachine({
        types: {} as { context: { id: number; succeed: boolean } },
        id: 'invokePromise',
        initial: 'pending',
        context: ({
          input,
        }: {
          input: { id?: number; succeed?: boolean };
        }) => ({
          id: 42,
          succeed: true,
          ...input,
        }),
        states: {
          pending: {
            invoke: {
              src: fromPromise(({ input }) =>
                createPromise((resolve) => {
                  if (input.succeed) {
                    resolve(input.id);
                  } else {
                    throw new Error(`failed on purpose for: ${input.id}`);
                  }
                })
              ),
              input: ({ context }: any) => context,
              onDone: {
                target: 'success',
                guard: ({ context, event }) => {
                  return event.output === context.id;
                },
              },
              onError: 'failure',
            },
          },
          success: {
            type: 'final',
          },
          failure: {
            type: 'final',
          },
        },
      });

      it('should be invoked with a promise factory and resolve through onDone', (done) => {
        const machine = createMachine({
          initial: 'pending',
          states: {
            pending: {
              invoke: {
                src: fromPromise(() =>
                  createPromise((resolve) => {
                    resolve();
                  })
                ),
                onDone: 'success',
              },
            },
            success: {
              type: 'final',
            },
          },
        });
        const service = createActor(machine);
        service.subscribe({
          complete: () => {
            done();
          },
        });
        service.start();
      });

      it('should be invoked with a promise factory and reject with ErrorExecution', (done) => {
        const actor = createActor(invokePromiseMachine, {
          input: { id: 31, succeed: false },
        });
        actor.subscribe({ complete: () => done() });
        actor.start();
      });

      it('should be invoked with a promise factory and surface any unhandled errors', (done) => {
        const promiseMachine = createMachine({
          id: 'invokePromise',
          initial: 'pending',
          states: {
            pending: {
              invoke: {
                src: fromPromise(() =>
                  createPromise(() => {
                    throw new Error('test');
                  })
                ),
                onDone: 'success',
              },
            },
            success: {
              type: 'final',
            },
          },
        });

        const service = createActor(promiseMachine);
        service.subscribe({
          error(err) {
            expect((err as any).message).toEqual(expect.stringMatching(/test/));
            done();
          },
        });

        service.start();
      });

      it('should be invoked with a promise factory and stop on unhandled onError target', (done) => {
        const completeSpy = jest.fn();

        const promiseMachine = createMachine({
          id: 'invokePromise',
          initial: 'pending',
          states: {
            pending: {
              invoke: {
                src: fromPromise(() =>
                  createPromise(() => {
                    throw new Error('test');
                  })
                ),
                onDone: 'success',
              },
            },
            success: {
              type: 'final',
            },
          },
        });

        const actor = createActor(promiseMachine);

        actor.subscribe({
          error: (err) => {
            expect(err).toBeInstanceOf(Error);
            expect((err as any).message).toBe('test');
            expect(completeSpy).not.toHaveBeenCalled();
            done();
          },
          complete: completeSpy,
        });
        actor.start();
      });

      it('should be invoked with a promise factory and resolve through onDone for compound state nodes', (done) => {
        const promiseMachine = createMachine({
          id: 'promise',
          initial: 'parent',
          states: {
            parent: {
              initial: 'pending',
              states: {
                pending: {
                  invoke: {
                    src: fromPromise(() =>
                      createPromise((resolve) => resolve())
                    ),
                    onDone: 'success',
                  },
                },
                success: {
                  type: 'final',
                },
              },
              onDone: 'success',
            },
            success: {
              type: 'final',
            },
          },
        });
        const actor = createActor(promiseMachine);
        actor.subscribe({ complete: () => done() });
        actor.start();
      });

      it('should be invoked with a promise service and resolve through onDone for compound state nodes', (done) => {
        const promiseMachine = createMachine(
          {
            id: 'promise',
            initial: 'parent',
            states: {
              parent: {
                initial: 'pending',
                states: {
                  pending: {
                    invoke: {
                      src: 'somePromise',
                      onDone: 'success',
                    },
                  },
                  success: {
                    type: 'final',
                  },
                },
                onDone: 'success',
              },
              success: {
                type: 'final',
              },
            },
          },
          {
            actors: {
              somePromise: fromPromise(() =>
                createPromise((resolve) => resolve())
              ),
            },
          }
        );
        const actor = createActor(promiseMachine);
        actor.subscribe({ complete: () => done() });
        actor.start();
      });
      it('should assign the resolved data when invoked with a promise factory', (done) => {
        const promiseMachine = createMachine({
          types: {} as { context: { count: number } },
          id: 'promise',
          context: { count: 0 },
          initial: 'pending',
          states: {
            pending: {
              invoke: {
                src: fromPromise(() =>
                  createPromise((resolve) => resolve({ count: 1 }))
                ),
                onDone: {
                  target: 'success',
                  actions: assign({
                    count: ({ event }) => event.output.count,
                  }),
                },
              },
            },
            success: {
              type: 'final',
            },
          },
        });

        const actor = createActor(promiseMachine);
        actor.subscribe({
          complete: () => {
            expect(actor.getSnapshot().context.count).toEqual(1);
            done();
          },
        });
        actor.start();
      });

      it('should assign the resolved data when invoked with a promise service', (done) => {
        const promiseMachine = createMachine(
          {
            types: {} as { context: { count: number } },
            id: 'promise',
            context: { count: 0 },
            initial: 'pending',
            states: {
              pending: {
                invoke: {
                  src: 'somePromise',
                  onDone: {
                    target: 'success',
                    actions: assign({
                      count: ({ event }) => event.output.count,
                    }),
                  },
                },
              },
              success: {
                type: 'final',
              },
            },
          },
          {
            actors: {
              somePromise: fromPromise(() =>
                createPromise((resolve) => resolve({ count: 1 }))
              ),
            },
          }
        );

        const actor = createActor(promiseMachine);
        actor.subscribe({
          complete: () => {
            expect(actor.getSnapshot().context.count).toEqual(1);
            done();
          },
        });
        actor.start();
      });

      it('should provide the resolved data when invoked with a promise factory', (done) => {
        let count = 0;

        const promiseMachine = createMachine({
          id: 'promise',
          context: { count: 0 },
          initial: 'pending',
          states: {
            pending: {
              invoke: {
                src: fromPromise(() =>
                  createPromise((resolve) => resolve({ count: 1 }))
                ),
                onDone: {
                  target: 'success',
                  actions: ({ event }) => {
                    count = (event.output as any).count;
                  },
                },
              },
            },
            success: {
              type: 'final',
            },
          },
        });

        const actor = createActor(promiseMachine);
        actor.subscribe({
          complete: () => {
            expect(count).toEqual(1);
            done();
          },
        });
        actor.start();
      });

      it('should provide the resolved data when invoked with a promise service', (done) => {
        let count = 0;

        const promiseMachine = createMachine(
          {
            id: 'promise',
            initial: 'pending',
            states: {
              pending: {
                invoke: {
                  src: 'somePromise',
                  onDone: {
                    target: 'success',
                    actions: ({ event }) => {
                      count = event.output.count;
                    },
                  },
                },
              },
              success: {
                type: 'final',
              },
            },
          },
          {
            actors: {
              somePromise: fromPromise(() =>
                createPromise((resolve) => resolve({ count: 1 }))
              ),
            },
          }
        );

        const actor = createActor(promiseMachine);
        actor.subscribe({
          complete: () => {
            expect(count).toEqual(1);
            done();
          },
        });
        actor.start();
      });

      it('should be able to specify a Promise as a service', (done) => {
        interface BeginEvent {
          type: 'BEGIN';
          payload: boolean;
        }

        const promiseActor = fromPromise(
          ({ input }: { input: { foo: boolean; event: { payload: any } } }) => {
            return createPromise((resolve, reject) => {
              input.foo && input.event.payload ? resolve() : reject();
            });
          }
        );

        const promiseMachine = createMachine(
          {
            id: 'promise',
            types: {} as {
              context: { foo: boolean };
              events: BeginEvent;
              actors: {
                src: 'somePromise';
                logic: typeof promiseActor;
              };
            },
            initial: 'pending',
            context: {
              foo: true,
            },
            states: {
              pending: {
                on: {
                  BEGIN: 'first',
                },
              },
              first: {
                invoke: {
                  src: 'somePromise',
                  input: ({ context, event }) => ({
                    foo: context.foo,
                    event: event,
                  }),
                  onDone: 'last',
                },
              },
              last: {
                type: 'final',
              },
            },
          },
          {
            actors: {
              somePromise: promiseActor,
            },
          }
        );

        const actor = createActor(promiseMachine);
        actor.subscribe({ complete: () => done() });
        actor.start();
        actor.send({
          type: 'BEGIN',
          payload: true,
        });
      });

      it('should be able to reuse the same promise logic multiple times and create unique promise for each created actor', (done) => {
        const machine = createMachine(
          {
            types: {} as {
              context: {
                result1: number | null;
                result2: number | null;
              };
              actors: {
                src: 'getRandomNumber';
                logic: PromiseActorLogic<{ result: number }>;
              };
            },
            context: {
              result1: null,
              result2: null,
            },
            initial: 'pending',
            states: {
              pending: {
                type: 'parallel',
                states: {
                  state1: {
                    initial: 'active',
                    states: {
                      active: {
                        invoke: {
                          src: 'getRandomNumber',
                          onDone: {
                            target: 'success',
                            // TODO: we get DoneInvokeEvent<any> here, this gets fixed with https://github.com/microsoft/TypeScript/pull/48838
                            actions: assign(({ event }) => ({
                              result1: event.output.result,
                            })),
                          },
                        },
                      },
                      success: {
                        type: 'final',
                      },
                    },
                  },
                  state2: {
                    initial: 'active',
                    states: {
                      active: {
                        invoke: {
                          src: 'getRandomNumber',
                          onDone: {
                            target: 'success',
                            actions: assign(({ event }) => ({
                              result2: event.output.result,
                            })),
                          },
                        },
                      },
                      success: {
                        type: 'final',
                      },
                    },
                  },
                },
                onDone: 'done',
              },
              done: {
                type: 'final',
              },
            },
          },
          {
            actors: {
              // it's important for this actor to be reused, this test shouldn't use a factory or anything like that
              getRandomNumber: fromPromise(() => {
                return createPromise((resolve) =>
                  resolve({ result: Math.random() })
                );
              }),
            },
          }
        );

        const service = createActor(machine);
        service.subscribe({
          complete: () => {
            const snapshot = service.getSnapshot();
            expect(typeof snapshot.context.result1).toBe('number');
            expect(typeof snapshot.context.result2).toBe('number');
            expect(snapshot.context.result1).not.toBe(snapshot.context.result2);
            done();
          },
        });
        service.start();
      });

      it('should not emit onSnapshot if stopped', (done) => {
        const machine = createMachine({
          initial: 'active',
          states: {
            active: {
              invoke: {
                src: fromPromise(() =>
                  createPromise((res) => {
                    setTimeout(() => res(42), 5);
                  })
                ),
                onSnapshot: {},
              },
              on: {
                deactivate: 'inactive',
              },
            },
            inactive: {
              on: {
                '*': {
                  actions: ({ event }) => {
                    if (event.snapshot) {
                      throw new Error(
                        `Received unexpected event: ${event.type}`
                      );
                    }
                  },
                },
              },
            },
          },
        });

        const actor = createActor(machine).start();
        actor.send({ type: 'deactivate' });

        setTimeout(() => {
          done();
        }, 10);
      });
    });
  });

  describe('with callbacks', () => {
    it('should be able to specify a callback as a service', (done) => {
      interface BeginEvent {
        type: 'BEGIN';
        payload: boolean;
      }
      interface CallbackEvent {
        type: 'CALLBACK';
        data: number;
      }

      const someCallback = fromCallback(
        ({
          sendBack,
          input,
        }: {
          sendBack: (event: BeginEvent | CallbackEvent) => void;
          input: { foo: boolean; event: BeginEvent | CallbackEvent };
        }) => {
          if (input.foo && input.event.type === 'BEGIN') {
            sendBack({
              type: 'CALLBACK',
              data: 40,
            });
            sendBack({
              type: 'CALLBACK',
              data: 41,
            });
            sendBack({
              type: 'CALLBACK',
              data: 42,
            });
          }
        }
      );

      const callbackMachine = createMachine(
        {
          id: 'callback',
          types: {} as {
            context: { foo: boolean };
            events: BeginEvent | CallbackEvent;
            actors: {
              src: 'someCallback';
              logic: typeof someCallback;
            };
          },
          initial: 'pending',
          context: {
            foo: true,
          },
          states: {
            pending: {
              on: {
                BEGIN: 'first',
              },
            },
            first: {
              invoke: {
                src: 'someCallback',
                input: ({ context, event }) => ({
                  foo: context.foo,
                  event: event,
                }),
              },
              on: {
                CALLBACK: {
                  target: 'last',
                  guard: ({ event }) => event.data === 42,
                },
              },
            },
            last: {
              type: 'final',
            },
          },
        },
        {
          actors: {
            someCallback,
          },
        }
      );

      const actor = createActor(callbackMachine);
      actor.subscribe({ complete: () => done() });
      actor.start();
      actor.send({
        type: 'BEGIN',
        payload: true,
      });
    });

    it('should transition correctly if callback function sends an event', () => {
      const callbackMachine = createMachine(
        {
          id: 'callback',
          initial: 'pending',
          context: { foo: true },
          states: {
            pending: {
              on: { BEGIN: 'first' },
            },
            first: {
              invoke: {
                src: 'someCallback',
              },
              on: { CALLBACK: 'intermediate' },
            },
            intermediate: {
              on: { NEXT: 'last' },
            },
            last: {
              type: 'final',
            },
          },
        },
        {
          actors: {
            someCallback: fromCallback(({ sendBack }) => {
              sendBack({ type: 'CALLBACK' });
            }),
          },
        }
      );

      const expectedStateValues = ['pending', 'first', 'intermediate'];
      const stateValues: StateValue[] = [];
      const actor = createActor(callbackMachine);
      actor.subscribe((current) => stateValues.push(current.value));
      actor.start().send({ type: 'BEGIN' });
      for (let i = 0; i < expectedStateValues.length; i++) {
        expect(stateValues[i]).toEqual(expectedStateValues[i]);
      }
    });

    it('should transition correctly if callback function invoked from start and sends an event', () => {
      const callbackMachine = createMachine(
        {
          id: 'callback',
          initial: 'idle',
          context: { foo: true },
          states: {
            idle: {
              invoke: {
                src: 'someCallback',
              },
              on: { CALLBACK: 'intermediate' },
            },
            intermediate: {
              on: { NEXT: 'last' },
            },
            last: {
              type: 'final',
            },
          },
        },
        {
          actors: {
            someCallback: fromCallback(({ sendBack }) => {
              sendBack({ type: 'CALLBACK' });
            }),
          },
        }
      );

      const expectedStateValues = ['idle', 'intermediate'];
      const stateValues: StateValue[] = [];
      const actor = createActor(callbackMachine);
      actor.subscribe((current) => stateValues.push(current.value));
      actor.start().send({ type: 'BEGIN' });
      for (let i = 0; i < expectedStateValues.length; i++) {
        expect(stateValues[i]).toEqual(expectedStateValues[i]);
      }
    });

    // tslint:disable-next-line:max-line-length
    it('should transition correctly if transient transition happens before current state invokes callback function and sends an event', () => {
      const callbackMachine = createMachine(
        {
          id: 'callback',
          initial: 'pending',
          context: { foo: true },
          states: {
            pending: {
              on: { BEGIN: 'first' },
            },
            first: {
              always: 'second',
            },
            second: {
              invoke: {
                src: 'someCallback',
              },
              on: { CALLBACK: 'third' },
            },
            third: {
              on: { NEXT: 'last' },
            },
            last: {
              type: 'final',
            },
          },
        },
        {
          actors: {
            someCallback: fromCallback(({ sendBack }) => {
              sendBack({ type: 'CALLBACK' });
            }),
          },
        }
      );

      const expectedStateValues = ['pending', 'second', 'third'];
      const stateValues: StateValue[] = [];
      const actor = createActor(callbackMachine);
      actor.subscribe((current) => {
        stateValues.push(current.value);
      });
      actor.start().send({ type: 'BEGIN' });

      for (let i = 0; i < expectedStateValues.length; i++) {
        expect(stateValues[i]).toEqual(expectedStateValues[i]);
      }
    });

    it('should treat a callback source as an event stream', (done) => {
      const intervalMachine = createMachine({
        types: {} as { context: { count: number } },
        id: 'interval',
        initial: 'counting',
        context: {
          count: 0,
        },
        states: {
          counting: {
            invoke: {
              id: 'intervalService',
              src: fromCallback(({ sendBack }) => {
                const ivl = setInterval(() => {
                  sendBack({ type: 'INC' });
                }, 10);

                return () => clearInterval(ivl);
              }),
            },
            always: {
              target: 'finished',
              guard: ({ context }) => context.count === 3,
            },
            on: {
              INC: {
                actions: assign({ count: ({ context }) => context.count + 1 }),
              },
            },
          },
          finished: {
            type: 'final',
          },
        },
      });
      const actor = createActor(intervalMachine);
      actor.subscribe({ complete: () => done() });
      actor.start();
    });

    it('should dispose of the callback (if disposal function provided)', () => {
      const spy = jest.fn();
      const intervalMachine = createMachine({
        id: 'interval',
        initial: 'counting',
        states: {
          counting: {
            invoke: {
              id: 'intervalService',
              src: fromCallback(() => spy),
            },
            on: {
              NEXT: 'idle',
            },
          },
          idle: {},
        },
      });
      const actorRef = createActor(intervalMachine).start();

      actorRef.send({ type: 'NEXT' });

      expect(spy).toHaveBeenCalled();
    });

    it('callback should be able to receive messages from parent', (done) => {
      const pingPongMachine = createMachine({
        id: 'ping-pong',
        initial: 'active',
        states: {
          active: {
            invoke: {
              id: 'child',
              src: fromCallback(({ sendBack, receive }) => {
                receive((e) => {
                  if (e.type === 'PING') {
                    sendBack({ type: 'PONG' });
                  }
                });
              }),
            },
            entry: sendTo('child', { type: 'PING' }),
            on: {
              PONG: 'done',
            },
          },
          done: {
            type: 'final',
          },
        },
      });
      const actor = createActor(pingPongMachine);
      actor.subscribe({ complete: () => done() });
      actor.start();
    });

    it('should call onError upon error (sync)', (done) => {
      const errorMachine = createMachine({
        id: 'error',
        initial: 'safe',
        states: {
          safe: {
            invoke: {
              src: fromCallback(() => {
                throw new Error('test');
              }),
              onError: {
                target: 'failed',
                guard: ({ event }) => {
                  return (
                    event.error instanceof Error &&
                    event.error.message === 'test'
                  );
                },
              },
            },
          },
          failed: {
            type: 'final',
          },
        },
      });
      const actor = createActor(errorMachine);
      actor.subscribe({ complete: () => done() });
      actor.start();
    });

    it('should transition correctly upon error (sync)', () => {
      const errorMachine = createMachine({
        id: 'error',
        initial: 'safe',
        states: {
          safe: {
            invoke: {
              src: fromCallback(() => {
                throw new Error('test');
              }),
              onError: 'failed',
            },
          },
          failed: {
            on: { RETRY: 'safe' },
          },
        },
      });

      const expectedStateValue = 'failed';
      const service = createActor(errorMachine).start();
      expect(service.getSnapshot().value).toEqual(expectedStateValue);
    });

    it('should call onError only on the state which has invoked failed service', () => {
      const errorMachine = createMachine({
        initial: 'start',
        states: {
          start: {
            on: {
              FETCH: 'fetch',
            },
          },
          fetch: {
            type: 'parallel',
            states: {
              first: {
                initial: 'waiting',
                states: {
                  waiting: {
                    invoke: {
                      src: fromCallback(() => {
                        throw new Error('test');
                      }),
                      onError: {
                        target: 'failed',
                      },
                    },
                  },
                  failed: {},
                },
              },
              second: {
                initial: 'waiting',
                states: {
                  waiting: {
                    invoke: {
                      src: fromCallback(() => {
                        // empty
                        return () => {};
                      }),
                      onError: {
                        target: 'failed',
                      },
                    },
                  },
                  failed: {},
                },
              },
            },
          },
        },
      });

      const actorRef = createActor(errorMachine).start();
      actorRef.send({ type: 'FETCH' });

      expect(actorRef.getSnapshot().value).toEqual({
        fetch: { first: 'failed', second: 'waiting' },
      });
    });

    it('should be able to be stringified', () => {
      const machine = createMachine({
        initial: 'idle',
        states: {
          idle: {
            on: {
              GO_TO_WAITING: 'waiting',
            },
          },
          waiting: {
            invoke: {
              src: fromCallback(() => {}),
            },
          },
        },
      });
      const actorRef = createActor(machine).start();
      actorRef.send({ type: 'GO_TO_WAITING' });
      const waitingState = actorRef.getSnapshot();

      expect(() => {
        JSON.stringify(waitingState);
      }).not.toThrow();
    });

    it('should result in an error notification if callback actor throws when it starts and the error stays unhandled by the machine', () => {
      const errorMachine = createMachine({
        initial: 'safe',
        states: {
          safe: {
            invoke: {
              src: fromCallback(() => {
                throw new Error('test');
              }),
            },
          },
          failed: {
            type: 'final',
          },
        },
      });
      const spy = jest.fn();

      const actorRef = createActor(errorMachine);
      actorRef.subscribe({
        error: spy,
      });
      actorRef.start();
      expect(spy.mock.calls).toMatchInlineSnapshot(`
        [
          [
            [Error: test],
          ],
        ]
      `);
    });

    it('should work with input', (done) => {
      const machine = createMachine({
        types: {} as {
          context: { foo: string };
        },
        initial: 'start',
        context: { foo: 'bar' },
        states: {
          start: {
            invoke: {
              src: fromCallback(({ input }) => {
                expect(input).toEqual({ foo: 'bar' });
                done();
              }),
              input: ({ context }: any) => context,
            },
          },
        },
      });

      createActor(machine).start();
    });

    it('sub invoke race condition ends on the completed state', () => {
      const anotherChildMachine = createMachine({
        id: 'child',
        initial: 'start',
        states: {
          start: {
            on: { STOP: 'end' },
          },
          end: {
            type: 'final',
          },
        },
      });

      const anotherParentMachine = createMachine({
        id: 'parent',
        initial: 'begin',
        states: {
          begin: {
            invoke: {
              src: anotherChildMachine,
              id: 'invoked.child',
              onDone: 'completed',
            },
            on: {
              STOPCHILD: {
                actions: sendTo('invoked.child', { type: 'STOP' }),
              },
            },
          },
          completed: {
            type: 'final',
          },
        },
      });

      const actorRef = createActor(anotherParentMachine).start();
      actorRef.send({ type: 'STOPCHILD' });

      expect(actorRef.getSnapshot().value).toEqual('completed');
    });
  });

  describe('invoke input', () => {
    it('should provide input to an actor creator', (done) => {
      const machine = createMachine(
        {
          types: {} as {
            context: { count: number };
            actors: {
              src: 'stringService';
              logic: PromiseActorLogic<
                boolean,
                {
                  staticVal: string;
                  newCount: number;
                }
              >;
            };
          },
          initial: 'pending',
          context: {
            count: 42,
          },
          states: {
            pending: {
              invoke: {
                src: 'stringService',
                input: ({ context }) => ({
                  staticVal: 'hello',
                  newCount: context.count * 2,
                }),
                onDone: 'success',
              },
            },
            success: {
              type: 'final',
            },
          },
        },
        {
          actors: {
            stringService: fromPromise(({ input }) => {
              expect(input).toEqual({ newCount: 84, staticVal: 'hello' });

              return Promise.resolve(true);
            }),
          },
        }
      );

      const service = createActor(machine);
      service.subscribe({
        complete: () => {
          done();
        },
      });

      service.start();
    });

    it('should provide self to input mapper', (done) => {
      const machine = createMachine({
        invoke: {
          src: fromCallback(({ input }) => {
            expect(input.responder.send).toBeDefined();
            done();
          }),
          input: ({ self }) => ({
            responder: self,
          }),
        },
      });

      createActor(machine).start();
    });
  });
});
