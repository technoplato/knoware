import {
  StateValue,
  assign,
  createActor,
  createMachine,
  raise,
  sendParent,
  sendTo,
} from 'xstate';

const composerMachine = createMachine({
  initial: 'ReadOnly',
  states: {
    ReadOnly: {
      id: 'ReadOnly',
      initial: 'StructureEdit',
      entry: ['selectNone'],
      states: {
        StructureEdit: {
          id: 'StructureEditRO',
          type: 'parallel',
          on: {
            switchToProjectManagement: [
              {
                target: 'ProjectManagement',
              },
            ],
          },
          states: {
            SelectionStatus: {
              initial: 'SelectedNone',
              on: {
                singleClickActivity: [
                  {
                    target: '.SelectedActivity',
                    actions: ['selectActivity'],
                  },
                ],
                singleClickLink: [
                  {
                    target: '.SelectedLink',
                    actions: ['selectLink'],
                  },
                ],
              },
              states: {
                SelectedNone: {
                  entry: ['redraw'],
                },
                SelectedActivity: {
                  entry: ['redraw'],
                  on: {
                    singleClickCanvas: [
                      {
                        target: 'SelectedNone',
                        actions: ['selectNone'],
                      },
                    ],
                  },
                },
                SelectedLink: {
                  entry: ['redraw'],
                  on: {
                    singleClickCanvas: [
                      {
                        target: 'SelectedNone',
                        actions: ['selectNone'],
                      },
                    ],
                  },
                },
              },
            },
            ClipboardStatus: {
              initial: 'Empty',
              states: {
                Empty: {
                  entry: ['emptyClipboard'],
                  on: {
                    cutInClipboardSuccess: [
                      {
                        target: 'FilledByCut',
                      },
                    ],
                    copyInClipboardSuccess: [
                      {
                        target: 'FilledByCopy',
                      },
                    ],
                  },
                },
                FilledByCopy: {
                  on: {
                    cutInClipboardSuccess: [
                      {
                        target: 'FilledByCut',
                      },
                    ],
                    copyInClipboardSuccess: [
                      {
                        target: 'FilledByCopy',
                      },
                    ],
                    pasteFromClipboardSuccess: [
                      {
                        target: 'FilledByCopy',
                      },
                    ],
                  },
                },
                FilledByCut: {
                  on: {
                    cutInClipboardSuccess: [
                      {
                        target: 'FilledByCut',
                      },
                    ],
                    copyInClipboardSuccess: [
                      {
                        target: 'FilledByCopy',
                      },
                    ],
                    pasteFromClipboardSuccess: [
                      {
                        target: 'Empty',
                      },
                    ],
                  },
                },
              },
            },
          },
        },
        ProjectManagement: {
          id: 'ProjectManagementRO',
          type: 'parallel',
          on: {
            switchToStructureEdit: [
              {
                target: 'StructureEdit',
              },
            ],
          },
          states: {
            SelectionStatus: {
              initial: 'SelectedNone',
              on: {
                singleClickActivity: [
                  {
                    target: '.SelectedActivity',
                    actions: ['selectActivity'],
                  },
                ],
                singleClickLink: [
                  {
                    target: '.SelectedLink',
                    actions: ['selectLink'],
                  },
                ],
              },
              states: {
                SelectedNone: {
                  entry: ['redraw'],
                },
                SelectedActivity: {
                  entry: ['redraw'],
                  on: {
                    singleClickCanvas: [
                      {
                        target: 'SelectedNone',
                        actions: ['selectNone'],
                      },
                    ],
                  },
                },
                SelectedLink: {
                  entry: ['redraw'],
                  on: {
                    singleClickCanvas: [
                      {
                        target: 'SelectedNone',
                        actions: ['selectNone'],
                      },
                    ],
                  },
                },
              },
            },
          },
        },
      },
    },
  },
});

const wakMachine = createMachine({
  id: 'wakMachine',
  type: 'parallel',

  states: {
    wak1: {
      initial: 'wak1sonA',
      states: {
        wak1sonA: {
          entry: 'wak1sonAenter',
          exit: 'wak1sonAexit',
        },
        wak1sonB: {
          entry: 'wak1sonBenter',
          exit: 'wak1sonBexit',
        },
      },
      on: {
        WAK1: '.wak1sonB',
      },
      entry: 'wak1enter',
      exit: 'wak1exit',
    },
    wak2: {
      initial: 'wak2sonA',
      states: {
        wak2sonA: {
          entry: 'wak2sonAenter',
          exit: 'wak2sonAexit',
        },
        wak2sonB: {
          entry: 'wak2sonBenter',
          exit: 'wak2sonBexit',
        },
      },
      on: {
        WAK2: '.wak2sonB',
      },
      entry: 'wak2enter',
      exit: 'wak2exit',
    },
  },
});

const wordMachine = createMachine({
  id: 'word',
  type: 'parallel',
  states: {
    bold: {
      initial: 'off',
      states: {
        on: {
          on: { TOGGLE_BOLD: 'off' },
        },
        off: {
          on: { TOGGLE_BOLD: 'on' },
        },
      },
    },
    underline: {
      initial: 'off',
      states: {
        on: {
          on: { TOGGLE_UNDERLINE: 'off' },
        },
        off: {
          on: { TOGGLE_UNDERLINE: 'on' },
        },
      },
    },
    italics: {
      initial: 'off',
      states: {
        on: {
          on: { TOGGLE_ITALICS: 'off' },
        },
        off: {
          on: { TOGGLE_ITALICS: 'on' },
        },
      },
    },
    list: {
      initial: 'none',
      states: {
        none: {
          on: { BULLETS: 'bullets', NUMBERS: 'numbers' },
        },
        bullets: {
          on: { NONE: 'none', NUMBERS: 'numbers' },
        },
        numbers: {
          on: { BULLETS: 'bullets', NONE: 'none' },
        },
      },
    },
  },
  on: {
    RESET: '#word', // TODO: this should be 'word' or [{ internal: false }]
  },
});

const flatParallelMachine = createMachine({
  type: 'parallel',
  states: {
    foo: {},
    bar: {},
    baz: {
      initial: 'one',
      states: {
        one: { on: { E: 'two' } },
        two: {},
      },
    },
  },
});

const raisingParallelMachine = createMachine({
  type: 'parallel',
  states: {
    OUTER1: {
      initial: 'C',
      states: {
        A: {
          entry: [raise({ type: 'TURN_OFF' })],
          on: {
            EVENT_OUTER1_B: 'B',
            EVENT_OUTER1_C: 'C',
          },
        },
        B: {
          entry: [raise({ type: 'TURN_ON' })],
          on: {
            EVENT_OUTER1_A: 'A',
            EVENT_OUTER1_C: 'C',
          },
        },
        C: {
          entry: [raise({ type: 'CLEAR' })],
          on: {
            EVENT_OUTER1_A: 'A',
            EVENT_OUTER1_B: 'B',
          },
        },
      },
    },
    OUTER2: {
      type: 'parallel',
      states: {
        INNER1: {
          initial: 'ON',
          states: {
            OFF: {
              on: {
                TURN_ON: 'ON',
              },
            },
            ON: {
              on: {
                CLEAR: 'OFF',
              },
            },
          },
        },
        INNER2: {
          initial: 'OFF',
          states: {
            OFF: {
              on: {
                TURN_ON: 'ON',
              },
            },
            ON: {
              on: {
                TURN_OFF: 'OFF',
              },
            },
          },
        },
      },
    },
  },
});

const nestedParallelState = createMachine({
  type: 'parallel',
  states: {
    OUTER1: {
      initial: 'STATE_OFF',
      states: {
        STATE_OFF: {
          on: {
            EVENT_COMPLEX: 'STATE_ON',
            EVENT_SIMPLE: 'STATE_ON',
          },
        },
        STATE_ON: {
          type: 'parallel',
          states: {
            STATE_NTJ0: {
              initial: 'STATE_IDLE_0',
              states: {
                STATE_IDLE_0: {
                  on: {
                    EVENT_STATE_NTJ0_WORK: 'STATE_WORKING_0',
                  },
                },
                STATE_WORKING_0: {
                  on: {
                    EVENT_STATE_NTJ0_IDLE: 'STATE_IDLE_0',
                  },
                },
              },
            },
            STATE_NTJ1: {
              initial: 'STATE_IDLE_1',
              states: {
                STATE_IDLE_1: {
                  on: {
                    EVENT_STATE_NTJ1_WORK: 'STATE_WORKING_1',
                  },
                },
                STATE_WORKING_1: {
                  on: {
                    EVENT_STATE_NTJ1_IDLE: 'STATE_IDLE_1',
                  },
                },
              },
            },
          },
        },
      },
    },
    OUTER2: {
      initial: 'STATE_OFF',
      states: {
        STATE_OFF: {
          on: {
            EVENT_COMPLEX: 'STATE_ON_COMPLEX',
            EVENT_SIMPLE: 'STATE_ON_SIMPLE',
          },
        },
        STATE_ON_SIMPLE: {},
        STATE_ON_COMPLEX: {
          type: 'parallel',
          states: {
            STATE_INNER1: {
              initial: 'STATE_OFF',
              states: {
                STATE_OFF: {},
                STATE_ON: {},
              },
            },
            STATE_INNER2: {
              initial: 'STATE_OFF',
              states: {
                STATE_OFF: {},
                STATE_ON: {},
              },
            },
          },
        },
      },
    },
  },
});

const deepFlatParallelMachine = createMachine({
  type: 'parallel',
  states: {
    X: {},
    V: {
      initial: 'A',
      on: {
        a: {
          target: 'V.A',
        },
        b: {
          target: 'V.B',
        },
        c: {
          target: 'V.C',
        },
      },
      states: {
        A: {},
        B: {
          initial: 'BB',
          states: {
            BB: {
              type: 'parallel',
              states: {
                BBB_A: {},
                BBB_B: {},
              },
            },
          },
        },
        C: {},
      },
    },
  },
});

describe('parallel states', () => {
  it('should have initial parallel states', () => {
    const initialState = createActor(wordMachine).getSnapshot();

    expect(initialState.value).toEqual({
      bold: 'off',
      italics: 'off',
      underline: 'off',
      list: 'none',
    });
  });

  const expected: Record<string, Record<string, StateValue>> = {
    '{"bold": "off"}': {
      TOGGLE_BOLD: {
        bold: 'on',
        italics: 'off',
        underline: 'off',
        list: 'none',
      },
    },
    '{"bold": "on"}': {
      TOGGLE_BOLD: {
        bold: 'off',
        italics: 'off',
        underline: 'off',
        list: 'none',
      },
    },
    [JSON.stringify({
      bold: 'off',
      italics: 'off',
      underline: 'on',
      list: 'bullets',
    })]: {
      'TOGGLE_BOLD, TOGGLE_ITALICS': {
        bold: 'on',
        italics: 'on',
        underline: 'on',
        list: 'bullets',
      },
      RESET: {
        bold: 'off',
        italics: 'off',
        underline: 'off',
        list: 'none',
      },
    },
  };

  it('should have all parallel states represented in the state value', () => {
    const machine = createMachine({
      type: 'parallel',
      states: {
        wak1: {
          initial: 'wak1sonA',
          states: {
            wak1sonA: {},
            wak1sonB: {},
          },
          on: {
            WAK1: '.wak1sonB',
          },
        },
        wak2: {
          initial: 'wak2sonA',
          states: {
            wak2sonA: {},
          },
        },
      },
    });
    const actorRef = createActor(machine).start();
    actorRef.send({ type: 'WAK1' });

    expect(actorRef.getSnapshot().value).toEqual({
      wak1: 'wak1sonB',
      wak2: 'wak2sonA',
    });
  });

  it('should have all parallel states represented in the state value (2)', () => {
    const actorRef = createActor(wakMachine).start();
    actorRef.send({ type: 'WAK2' });

    expect(actorRef.getSnapshot().value).toEqual({
      wak1: 'wak1sonA',
      wak2: 'wak2sonB',
    });
  });

  it('should work with regions without states', () => {
    expect(createActor(flatParallelMachine).getSnapshot().value).toEqual({
      foo: {},
      bar: {},
      baz: 'one',
    });
  });

  it('should work with regions without states', () => {
    const actorRef = createActor(flatParallelMachine).start();
    actorRef.send({ type: 'E' });
    expect(actorRef.getSnapshot().value).toEqual({
      foo: {},
      bar: {},
      baz: 'two',
    });
  });

  it('should properly transition to relative substate', () => {
    const actorRef = createActor(composerMachine).start();
    actorRef.send({
      type: 'singleClickActivity',
    });

    expect(actorRef.getSnapshot().value).toEqual({
      ReadOnly: {
        StructureEdit: {
          SelectionStatus: 'SelectedActivity',
          ClipboardStatus: 'Empty',
        },
      },
    });
  });

  it('should properly transition according to entry events on an initial state', () => {
    const machine = createMachine({
      type: 'parallel',
      states: {
        OUTER1: {
          initial: 'B',
          states: {
            A: {},
            B: {
              entry: raise({ type: 'CLEAR' }),
            },
          },
        },
        OUTER2: {
          type: 'parallel',
          states: {
            INNER1: {
              initial: 'ON',
              states: {
                OFF: {},
                ON: {
                  on: {
                    CLEAR: 'OFF',
                  },
                },
              },
            },
            INNER2: {
              initial: 'OFF',
              states: {
                OFF: {},
                ON: {},
              },
            },
          },
        },
      },
    });
    expect(createActor(machine).getSnapshot().value).toEqual({
      OUTER1: 'B',
      OUTER2: {
        INNER1: 'OFF',
        INNER2: 'OFF',
      },
    });
  });

  it('should properly transition when raising events for a parallel state', () => {
    const actorRef = createActor(raisingParallelMachine).start();
    actorRef.send({
      type: 'EVENT_OUTER1_B',
    });

    expect(actorRef.getSnapshot().value).toEqual({
      OUTER1: 'B',
      OUTER2: {
        INNER1: 'ON',
        INNER2: 'ON',
      },
    });
  });

  it('should handle simultaneous orthogonal transitions', () => {
    type Events = { type: 'CHANGE'; value: string } | { type: 'SAVE' };
    const simultaneousMachine = createMachine({
      /** @xstate-layout N4IgpgJg5mDOIC5QE8CGBbANgUQgSwBcB7AJwDpJC8A7KAYgGEAJAQQDkBxbAbQAYBdRKAAORWFSLUhIAB6IAjAA4AzGWWKATMoDs2gCyLtG+b20A2ADQhkiRfLIbTGzXoCc7s670aAvj6toWLiEpGSwBKgEAK6wZFHUsKgAbpB0AMosAGo8AtKi4gR4ktJyCPKuGmQArEpmZvLKeka8plUBiMpVrmRKRoqunVXKyryNfgEYOPjE5OGRMWHJqczsXHyCSCD5ElKbpeWVNYp1DU2Ore0II90aGvV6Xbe88lVVfv4g1EQQcNKBUyESHkxDsSogALQaPSXcFVMiuRQtZ6jcrKCpQ8bWSbBGYUaY0KDAgpFXagUo1MhmXh2MyKB7U+RmNGXEyqJm8LTaDnKMyvHSY-440JzaLwTbbQrFPaIKGXW6VUaKOkabTKeR6RmuMwC7HTYURUVxBJLCBE0HShBGS5quG8bx6dTuZxKxQ6oJ62YGhaJFKm8UgyWk2QdcpkLlVUzPOw8xzKa3ybTVe2Oiou7TvHxAA */
      types: {} as { context: { value: string }; events: Events },
      id: 'yamlEditor',
      type: 'parallel',
      context: {
        value: '',
      },
      states: {
        editing: {
          on: {
            CHANGE: {
              actions: assign({
                value: ({ event }) => event.value,
              }),
            },
          },
        },
        status: {
          initial: 'unsaved',
          states: {
            unsaved: {
              on: {
                SAVE: {
                  target: 'saved',
                  actions: 'save',
                },
              },
            },
            saved: {
              on: {
                CHANGE: 'unsaved',
              },
            },
          },
        },
      },
    });

    const actorRef = createActor(simultaneousMachine).start();
    actorRef.send({
      type: 'SAVE',
    });
    actorRef.send({
      type: 'CHANGE',
      value: 'something',
    });

    expect(actorRef.getSnapshot().value).toEqual({
      editing: {},
      status: 'unsaved',
    });

    expect(actorRef.getSnapshot().context).toEqual({
      value: 'something',
    });
  });

  it('should execute actions of the initial transition of a parallel region when entering the initial state nodes of a machine', () => {
    const spy = jest.fn();

    const machine = createMachine({
      type: 'parallel',
      states: {
        a: {
          initial: {
            target: 'a1',
            actions: spy,
          },
          states: {
            a1: {},
          },
        },
      },
    });

    createActor(machine).start();

    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('should execute actions of the initial transition of a parallel region when the parallel state is targeted with an explicit transition', () => {
    const spy = jest.fn();

    const machine = createMachine({
      initial: 'a',
      states: {
        a: {
          on: {
            NEXT: 'b',
          },
        },
        b: {
          type: 'parallel',
          states: {
            c: {
              initial: {
                target: 'c1',
                actions: spy,
              },
              states: {
                c1: {},
              },
            },
          },
        },
      },
    });

    const actorRef = createActor(machine).start();

    actorRef.send({ type: 'NEXT' });

    expect(spy).toHaveBeenCalledTimes(1);
  });

  describe('transitions with nested parallel states', () => {
    it('should properly transition when in a simple nested state', () => {
      const actorRef = createActor(nestedParallelState).start();
      actorRef.send({
        type: 'EVENT_SIMPLE',
      });
      actorRef.send({
        type: 'EVENT_STATE_NTJ0_WORK',
      });

      expect(actorRef.getSnapshot().value).toEqual({
        OUTER1: {
          STATE_ON: {
            STATE_NTJ0: 'STATE_WORKING_0',
            STATE_NTJ1: 'STATE_IDLE_1',
          },
        },
        OUTER2: 'STATE_ON_SIMPLE',
      });
    });

    it('should properly transition when in a complex nested state', () => {
      const actorRef = createActor(nestedParallelState).start();
      actorRef.send({
        type: 'EVENT_COMPLEX',
      });
      actorRef.send({
        type: 'EVENT_STATE_NTJ0_WORK',
      });

      expect(actorRef.getSnapshot().value).toEqual({
        OUTER1: {
          STATE_ON: {
            STATE_NTJ0: 'STATE_WORKING_0',
            STATE_NTJ1: 'STATE_IDLE_1',
          },
        },
        OUTER2: {
          STATE_ON_COMPLEX: {
            STATE_INNER1: 'STATE_OFF',
            STATE_INNER2: 'STATE_OFF',
          },
        },
      });
    });
  });

  // https://github.com/statelyai/xstate/issues/191
  describe('nested flat parallel states', () => {
    const machine = createMachine({
      initial: 'A',
      states: {
        A: {
          on: {
            'to-B': 'B',
          },
        },
        B: {
          type: 'parallel',
          states: {
            C: {},
            D: {},
          },
        },
      },
      on: {
        'to-A': '.A',
      },
    });

    it('should represent the flat nested parallel states in the state value', () => {
      const actorRef = createActor(machine).start();
      actorRef.send({
        type: 'to-B',
      });

      expect(actorRef.getSnapshot().value).toEqual({
        B: {
          C: {},
          D: {},
        },
      });
    });
  });

  describe('deep flat parallel states', () => {
    it('should properly evaluate deep flat parallel states', () => {
      const actorRef = createActor(deepFlatParallelMachine).start();

      actorRef.send({ type: 'a' });
      actorRef.send({ type: 'c' });
      actorRef.send({ type: 'b' });

      expect(actorRef.getSnapshot().value).toEqual({
        V: {
          B: {
            BB: {
              BBB_A: {},
              BBB_B: {},
            },
          },
        },
        X: {},
      });
    });

    it('should not overlap resolved state nodes in state resolution', () => {
      const machine = createMachine({
        id: 'pipeline',
        type: 'parallel',
        states: {
          foo: {
            on: {
              UPDATE: {
                actions: () => {
                  /* do nothing */
                },
              },
            },
          },
          bar: {
            on: {
              UPDATE: '.baz',
            },
            initial: 'idle',
            states: {
              idle: {},
              baz: {},
            },
          },
        },
      });

      const actorRef = createActor(machine).start();
      expect(() => {
        actorRef.send({
          type: 'UPDATE',
        });
      }).not.toThrow();
    });
  });

  describe('other', () => {
    // https://github.com/statelyai/xstate/issues/518
    it('regions should be able to transition to orthogonal regions', () => {
      const testMachine = createMachine({
        type: 'parallel',
        states: {
          Pages: {
            initial: 'About',
            states: {
              About: {
                id: 'About',
              },
              Dashboard: {
                id: 'Dashboard',
              },
            },
          },
          Menu: {
            initial: 'Closed',
            states: {
              Closed: {
                id: 'Closed',
                on: {
                  toggle: '#Opened',
                },
              },
              Opened: {
                id: 'Opened',
                on: {
                  toggle: '#Closed',
                  'go to dashboard': {
                    target: ['#Dashboard', '#Opened'],
                  },
                },
              },
            },
          },
        },
      });

      const actorRef = createActor(testMachine).start();

      actorRef.send({ type: 'toggle' });
      actorRef.send({ type: 'go to dashboard' });

      expect(
        actorRef.getSnapshot().matches({ Menu: 'Opened', Pages: 'Dashboard' })
      ).toBe(true);
    });

    // https://github.com/statelyai/xstate/issues/531
    it('should calculate the entry set for reentering transitions in parallel states', () => {
      const testMachine = createMachine({
        types: {} as { context: { log: string[] } },
        id: 'test',
        context: { log: [] },
        type: 'parallel',
        states: {
          foo: {
            initial: 'foobar',
            states: {
              foobar: {
                on: {
                  GOTO_FOOBAZ: 'foobaz',
                },
              },
              foobaz: {
                entry: assign({
                  log: ({ context }) => [...context.log, 'entered foobaz'],
                }),
                on: {
                  GOTO_FOOBAZ: {
                    target: 'foobaz',
                    reenter: true,
                  },
                },
              },
            },
          },
          bar: {},
        },
      });

      const actorRef = createActor(testMachine).start();

      actorRef.send({
        type: 'GOTO_FOOBAZ',
      });
      actorRef.send({
        type: 'GOTO_FOOBAZ',
      });

      expect(actorRef.getSnapshot().context.log.length).toBe(2);
    });
  });

  it('should raise a "xstate.done.state.*" event when all child states reach final state', (done) => {
    const machine = createMachine({
      id: 'test',
      initial: 'p',
      states: {
        p: {
          type: 'parallel',
          states: {
            a: {
              initial: 'idle',
              states: {
                idle: {
                  on: {
                    FINISH: 'finished',
                  },
                },
                finished: {
                  type: 'final',
                },
              },
            },
            b: {
              initial: 'idle',
              states: {
                idle: {
                  on: {
                    FINISH: 'finished',
                  },
                },
                finished: {
                  type: 'final',
                },
              },
            },
            c: {
              initial: 'idle',
              states: {
                idle: {
                  on: {
                    FINISH: 'finished',
                  },
                },
                finished: {
                  type: 'final',
                },
              },
            },
          },
          onDone: 'success',
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

    service.send({ type: 'FINISH' });
  });

  it('should raise a "xstate.done.state.*" event when a pseudostate of a history type is directly on a parallel state', () => {
    const machine = createMachine({
      initial: 'parallelSteps',
      states: {
        parallelSteps: {
          type: 'parallel',
          states: {
            hist: {
              type: 'history',
            },
            one: {
              initial: 'wait_one',
              states: {
                wait_one: {
                  on: {
                    finish_one: {
                      target: 'done',
                    },
                  },
                },
                done: {
                  type: 'final',
                },
              },
            },
            two: {
              initial: 'wait_two',
              states: {
                wait_two: {
                  on: {
                    finish_two: {
                      target: 'done',
                    },
                  },
                },
                done: {
                  type: 'final',
                },
              },
            },
          },
          onDone: 'finished',
        },
        finished: {},
      },
    });

    const service = createActor(machine).start();

    service.send({ type: 'finish_one' });
    service.send({ type: 'finish_two' });

    expect(service.getSnapshot().value).toBe('finished');
  });

  describe('invoke', () => {
    it('child can immediately respond to the parent with multiple events', () => {
      const bluetoothPermissionMachine = createMachine({
        types: {} as {
          events: { type: 'FORWARD_DEC' };
        },
        //   id: 'bluetoothPermissionId',
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

      const permissionMonitoringMachine = createMachine(
        {
          id: 'parent',
          types: {} as {
            context: { count: number };
            actors: {
              src: 'bluetoothPermission';
              logic: typeof bluetoothPermissionMachine;
            };
          },
          context: { count: 0 },
          initial: 'start',
          states: {
            start: {
              invoke: {
                src: 'bluetoothPermission',
                id: 'bluetoothPermissionId',
              },
              always: {
                target: 'stop',
                guard: ({ context }) => context.count === -3,
              },
              on: {
                DEC: {
                  actions: assign({
                    count: ({ context }) => context.count - 1,
                  }),
                },
                FORWARD_DEC: {
                  actions: sendTo('bluetoothPermissionId', {
                    type: 'FORWARD_DEC',
                  }),
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
            bluetoothPermission: bluetoothPermissionMachine,
          },
        }
      );

      const actorRef = createActor(permissionMonitoringMachine).start();
      actorRef.send({ type: 'FORWARD_DEC' });

      // 1. The 'parent' machine will not do anything (inert transition)
      // 2. The 'FORWARD_DEC' event will be "forwarded" to the child machine
      // 3. On the child machine, the 'FORWARD_DEC' event sends the 'DEC' action to the parent thrice
      // 4. The context of the 'parent' machine will be updated from 0 to -3
      expect(actorRef.getSnapshot().context).toEqual({ count: -3 });
    });
  });
});

/*
Prompt for LLM:

Given these passing tests for xstate invoke and xstate parallel machines, can you please answer my following questions?

1) please create a test to see whether it is possible to do the following:
create a parallel machine with 2 parallel states
in state 1, raise an event to the "parent" machine that will be handled by two invoked actors in the second parallel state.
write a complete test in this style, I will report the findings of the test to the LLM and we can iterate.
*/

// claude

describe('assumptions', () => {
  it('should support parallel states', () => {
    const parallelMachine = createMachine({
      id: 'parent',
      type: 'parallel',
      states: {
        state1: {},
        state2: {},
      },
    });

    const actorRef = createActor(parallelMachine).start();

    expect(actorRef.getSnapshot().value).toEqual({
      state1: {},
      state2: {},
    });
  });

  it('should support invoking child machines', () => {
    const childMachine = createMachine({
      id: 'child',
      initial: 'idle',
      states: {
        idle: {},
      },
    });

    const parentMachine = createMachine({
      id: 'parent',
      initial: 'active',
      states: {
        active: {
          invoke: {
            id: 'child',
            src: childMachine,
          },
        },
      },
    });

    const actorRef = createActor(parentMachine).start();

    expect(actorRef.getSnapshot().value).toEqual({
      active: {
        child: 'idle',
      },
    });
  });

  it('should support sending events from child to parent', () => {
    const childMachine = createMachine({
      id: 'child',
      initial: 'idle',
      states: {
        idle: {
          on: {
            PING: {
              actions: sendParent({ type: 'PING_RECEIVED' }),
            },
          },
        },
      },
    });

    const parentMachine = createMachine({
      id: 'parent',
      initial: 'active',
      states: {
        active: {
          invoke: {
            id: 'child',
            src: childMachine,
          },
          on: {
            PING_RECEIVED: 'pinged',
          },
        },
        pinged: {},
      },
    });

    const actorRef = createActor(parentMachine).start();

    actorRef.send({ type: 'PING' });

    expect(actorRef.getSnapshot().value).toEqual('pinged');
  });

  it('should support sending events from parent to child', () => {
    const childMachine = createMachine({
      id: 'child',
      initial: 'idle',
      states: {
        idle: {
          on: {
            PING: 'pinged',
          },
        },
        pinged: {},
      },
    });

    const parentMachine = createMachine({
      id: 'parent',
      initial: 'active',
      states: {
        active: {
          invoke: {
            id: 'child',
            src: childMachine,
          },
          on: {
            SEND_PING: {
              actions: sendTo('child', 'PING'),
            },
          },
        },
      },
    });

    const actorRef = createActor(parentMachine).start();

    actorRef.send({ type: 'SEND_PING' });

    expect(actorRef.getSnapshot().value).toEqual({
      active: {
        child: 'pinged',
      },
    });
  });
});

it.skip('should handle events raised from one parallel state by invoking actors in another parallel state', () => {
  const childMachine1 = createMachine({
    id: 'child1',
    initial: 'idle',
    states: {
      idle: {
        on: {
          PING: {
            actions: [
              sendParent({ type: 'PING_RECEIVED' }),
              () => console.log('Child1: Sent PING_RECEIVED event to parent'),
            ],
          },
        },
      },
    },
  });

  const childMachine2 = createMachine({
    id: 'child2',
    initial: 'waiting',
    states: {
      waiting: {
        on: {
          PING_RECEIVED: {
            target: 'pinged',
            actions: () =>
              console.log(
                'Child2: Received PING_RECEIVED event, transitioning to pinged state'
              ),
          },
        },
      },
      pinged: {
        type: 'final',
      },
    },
  });

  const parentMachine = createMachine({
    /** @xstate-layout N4IgpgJg5mDOIC5QAcCGAnMA7ALgYgAUBJAOQHEB9AJQFEBhGogNRoBEBtABgF1EUB7WAEscQ-lj4gAHogC0ARgCcAJgB0nAGwBWAOwAWZfKVH5OgDQgAnonmctqjY+0Bmec+06jOgL7eLaTFxCUjIuXiQQZEERMQkImQRnZ0VVVz09Uy09LQ0ADi1FDQtrBHks1WU9RWcMjSNOHVy7Xz8QLH4IOEkA7Bxu6NFxSQSFRWLEZ2U1DSnkgvdKnS1nX38MXtVYHFQcMHl+4UG40AS9cytEPU4UxWzXOy15A0UdH1ae3E3t3eUDmKH4ohlGMLggqjoKho9K4ZnYlkYVu91p8tjswGpUABjHD8dD7CJRQ6xYaIV7jBBaXJ6VSUnTKGY6RzOTiTVaRZE4L5ojHY3G-AkDYmAhBk0F5G6aelU5SS7ItbxAA */
    id: 'parent',
    type: 'parallel',
    states: {
      state1: {
        invoke: {
          id: 'child1',
          src: childMachine1,
        },
      },
      state2: {
        type: 'parallel',
        states: {
          actor1: {
            invoke: {
              id: 'child2_1',
              src: childMachine2,
            },
          },
          actor2: {
            invoke: {
              id: 'child2_2',
              src: childMachine2,
            },
          },
        },
      },
    },
    on: {
      PING_RECEIVED: {
        actions: [
          sendTo('child1', { type: 'PING_RECEIVED' }),
          sendTo('child2_1', { type: 'PING_RECEIVED' }),
          sendTo('child2_2', { type: 'PING_RECEIVED' }),
          () =>
            console.log(
              'Parent: Received PING_RECEIVED event, sending it to child2 actors'
            ),
        ],
      },
      PING: {
        // send this to child2_1 and child2_2
        actions: [
          () => console.log('Parent: Sent PING event to child2 actors'),
          sendTo('child2_1', { type: 'PING_RECEIVED' }),
          sendTo('child2_2', { type: 'PING_RECEIVED' }),
        ],
      },
    },
  });

  const actorRef = createActor(parentMachine).start();

  // Initial state
  console.log('Initial state:', actorRef.getSnapshot().value);
  // Expected output:
  // Initial state: {
  //   state1: {},
  //   state2: {
  //     actor1: 'waiting',
  //     actor2: 'waiting'
  //   }
  // }

  // Send 'PING' event to child1
  actorRef.send({ type: 'PING' });

  // After sending 'PING' event
  console.log('After sending PING event:', actorRef.getSnapshot().value);
  // Expected output:
  // After sending PING event: {
  //   state1: {},
  //   state2: {
  //     actor1: 'pinged',
  //     actor2: 'pinged'
  //   }
  // }

  expect(actorRef.getSnapshot().value).toEqual({
    state1: {},
    state2: {
      actor1: 'pinged',
      actor2: 'pinged',
    },
  });
});
