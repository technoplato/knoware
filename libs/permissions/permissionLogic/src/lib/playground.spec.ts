import { assign, createActor, createMachine, sendParent, sendTo } from 'xstate';

describe('invoke', () => {
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
});
