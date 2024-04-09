import { createActor, createMachine } from 'xstate';

it('meta', () => {
  const feedbackMachine = createMachine({
    id: 'feedback',
    initial: 'prompt',
    meta: {
      title: 'Feedback',
    },
    states: {
      prompt: {
        meta: {
          content: 'How was your experience?',
        },
      },
      form: {
        meta: {
          content: 'Please fill out the form below.',
        },
      },
      thanks: {
        meta: {
          content: 'Thank you for your feedback!',
        },
      },
      closed: {},
    },
  });

  const feedbackActor = createActor(feedbackMachine).start();

  console.log(feedbackActor.getSnapshot().getMeta());
  // logs the object:
  // {
  //   feedback: {
  //     title: 'Feedback',
  //   },
  //   'feedback.prompt': {
  //     content: 'How was your experience?',
  //   }
  // }
});
// import {
//   ActorRef,
//   Snapshot,
//   StateValue,
//   assign,
//   createActor,
//   createMachine,
//   enqueueActions,
//   fromPromise,
//   log,
//   raise,
//   sendParent,
//   sendTo,
//   setup,
// } from 'xstate';
//
// const composerMachine = createMachine({
//   initial: 'ReadOnly',
//   states: {
//     ReadOnly: {
//       id: 'ReadOnly',
//       initial: 'StructureEdit',
//       entry: ['selectNone'],
//       states: {
//         StructureEdit: {
//           id: 'StructureEditRO',
//           type: 'parallel',
//           on: {
//             switchToProjectManagement: [
//               {
//                 target: 'ProjectManagement',
//               },
//             ],
//           },
//           states: {
//             SelectionStatus: {
//               initial: 'SelectedNone',
//               on: {
//                 singleClickActivity: [
//                   {
//                     target: '.SelectedActivity',
//                     actions: ['selectActivity'],
//                   },
//                 ],
//                 singleClickLink: [
//                   {
//                     target: '.SelectedLink',
//                     actions: ['selectLink'],
//                   },
//                 ],
//               },
//               states: {
//                 SelectedNone: {
//                   entry: ['redraw'],
//                 },
//                 SelectedActivity: {
//                   entry: ['redraw'],
//                   on: {
//                     singleClickCanvas: [
//                       {
//                         target: 'SelectedNone',
//                         actions: ['selectNone'],
//                       },
//                     ],
//                   },
//                 },
//                 SelectedLink: {
//                   entry: ['redraw'],
//                   on: {
//                     singleClickCanvas: [
//                       {
//                         target: 'SelectedNone',
//                         actions: ['selectNone'],
//                       },
//                     ],
//                   },
//                 },
//               },
//             },
//             ClipboardStatus: {
//               initial: 'Empty',
//               states: {
//                 Empty: {
//                   entry: ['emptyClipboard'],
//                   on: {
//                     cutInClipboardSuccess: [
//                       {
//                         target: 'FilledByCut',
//                       },
//                     ],
//                     copyInClipboardSuccess: [
//                       {
//                         target: 'FilledByCopy',
//                       },
//                     ],
//                   },
//                 },
//                 FilledByCopy: {
//                   on: {
//                     cutInClipboardSuccess: [
//                       {
//                         target: 'FilledByCut',
//                       },
//                     ],
//                     copyInClipboardSuccess: [
//                       {
//                         target: 'FilledByCopy',
//                       },
//                     ],
//                     pasteFromClipboardSuccess: [
//                       {
//                         target: 'FilledByCopy',
//                       },
//                     ],
//                   },
//                 },
//                 FilledByCut: {
//                   on: {
//                     cutInClipboardSuccess: [
//                       {
//                         target: 'FilledByCut',
//                       },
//                     ],
//                     copyInClipboardSuccess: [
//                       {
//                         target: 'FilledByCopy',
//                       },
//                     ],
//                     pasteFromClipboardSuccess: [
//                       {
//                         target: 'Empty',
//                       },
//                     ],
//                   },
//                 },
//               },
//             },
//           },
//         },
//         ProjectManagement: {
//           id: 'ProjectManagementRO',
//           type: 'parallel',
//           on: {
//             switchToStructureEdit: [
//               {
//                 target: 'StructureEdit',
//               },
//             ],
//           },
//           states: {
//             SelectionStatus: {
//               initial: 'SelectedNone',
//               on: {
//                 singleClickActivity: [
//                   {
//                     target: '.SelectedActivity',
//                     actions: ['selectActivity'],
//                   },
//                 ],
//                 singleClickLink: [
//                   {
//                     target: '.SelectedLink',
//                     actions: ['selectLink'],
//                   },
//                 ],
//               },
//               states: {
//                 SelectedNone: {
//                   entry: ['redraw'],
//                 },
//                 SelectedActivity: {
//                   entry: ['redraw'],
//                   on: {
//                     singleClickCanvas: [
//                       {
//                         target: 'SelectedNone',
//                         actions: ['selectNone'],
//                       },
//                     ],
//                   },
//                 },
//                 SelectedLink: {
//                   entry: ['redraw'],
//                   on: {
//                     singleClickCanvas: [
//                       {
//                         target: 'SelectedNone',
//                         actions: ['selectNone'],
//                       },
//                     ],
//                   },
//                 },
//               },
//             },
//           },
//         },
//       },
//     },
//   },
// });
//
// const wordMachine = createMachine({
//   id: 'word',
//   type: 'parallel',
//   states: {
//     bold: {
//       initial: 'off',
//       states: {
//         on: {
//           on: { TOGGLE_BOLD: 'off' },
//         },
//         off: {
//           on: { TOGGLE_BOLD: 'on' },
//         },
//       },
//     },
//     underline: {
//       initial: 'off',
//       states: {
//         on: {
//           on: { TOGGLE_UNDERLINE: 'off' },
//         },
//         off: {
//           on: { TOGGLE_UNDERLINE: 'on' },
//         },
//       },
//     },
//     italics: {
//       initial: 'off',
//       states: {
//         on: {
//           on: { TOGGLE_ITALICS: 'off' },
//         },
//         off: {
//           on: { TOGGLE_ITALICS: 'on' },
//         },
//       },
//     },
//     list: {
//       initial: 'none',
//       states: {
//         none: {
//           on: { BULLETS: 'bullets', NUMBERS: 'numbers' },
//         },
//         bullets: {
//           on: { NONE: 'none', NUMBERS: 'numbers' },
//         },
//         numbers: {
//           on: { BULLETS: 'bullets', NONE: 'none' },
//         },
//       },
//     },
//   },
//   on: {
//     RESET: '#word', // TODO: this should be 'word' or [{ internal: false }]
//   },
// });
//
// const flatParallelMachine = createMachine({
//   type: 'parallel',
//   states: {
//     foo: {},
//     bar: {},
//     baz: {
//       initial: 'one',
//       states: {
//         one: { on: { E: 'two' } },
//         two: {},
//       },
//     },
//   },
// });
//
// const raisingParallelMachine = createMachine({
//   /** @xstate-layout N4IgpgJg5mDOIC5QAoC2BDAxgCwJYDswBKAOgHkBVAFQFEAlARhIEEBiGgNRoDkqB9SrUZ8AQgG0ADAF1EoAA4B7WLgAuuBflkgAHogYSArAA4SRgOwA2AwE4LEiwGZLNgDQgAnogC0DgCwkJX19jXyMLOyNfBgYAXxi3NCw8QlJBeiY2Th5+NOEAYUkZJBBFZTUNLV0EL2sDEmtrACZfe2sHY0aLBka3TwQnRpIDcIN7XwdHM0ajBziEjBwCYnJqdJIRdi5eAVXhZkKtUtV1TWKq-WNTZ1t7JytrXsRrEl9LC0aph0aDKJm5kESixSKyETA2WW2uQYfAK0kOSmOFTO3gMjSYtQMNiMEgmDAsvh6HkQwSYZgYwwa1hx2Ia-0ByWWUJIeU22R2oL4+zhxSO5VOoCqNTqDWarXaRk63UeCCiFgC5jJRgMfgaCrpCwZqV2TBZEJy2tEBx5CL5lW8tXqTRaFjaHS6hL63wkJDRHzMErMDgcEgkRnVSSWWqEgwAktxuGsyAAxKOsKgUOjcATcI3yE0nM0IBhmZ61BgTfH5yJGaxmaVWOVGfM+zHNKZhf1Axm7UPhyPcVh5AAyNGYdFTJXTSIFehz9QM+fCUQcxdL0rMPpIXoJjkMnQmvkbmpB9FbEbog2jsfjieTA95GeRWbHeYL09nZaJCBLdXaXp+nwnjVm8QBGsDO4HiQYb7oeHYnkmR7nkO-I6KOuYTneRahHOT5KkwMyNIY2bhF8nRxL++AKBAcBaPSgbwmUl4jtUOZ1JiUTuvY4TRA8T5eFhJhmGYPzRL41jmAJ5JbgBUKUYisGCmYrxDLxTHhF0DBsX0XjdEwUQ+hI34fJETQWCJwJMsw4mmleXg2s8DEML4LFaT6yl6HKPyBFWVJksEWmNAZzagusJnUXB1QWbJjHYgprHSg4FrGHithGDMC4+j+8wBoZ2rMv5w6BeZDQhdmYUsdm5ZjhKEoMGEYQ2hYZjeUGu6ZZJiAWNKoSDL6aLmOV0zetYtWAXu6QNZmPzShSLyvDYjjKtxAl9bkA2MOQMZDVejTReYWE5u8vrWeW+IBEElivO05XmHNLbAW2i1kNwK00foDpNV0QyHT8zSluVm6-uRaXBpdoF3YFI1PkdLwKQSNjTRM51-SBu5LVGgPnFp0pKk5jgSl8hi1F8MPw3DQE3UjiDes6tgTBIH02kERiozYAQY9p2PKl5BFAA */
//   type: 'parallel',
//   states: {
//     OUTER1: {
//       initial: 'C',
//       states: {
//         A: {
//           entry: [raise({ type: 'TURN_OFF' })],
//           on: {
//             EVENT_OUTER1_B: 'B',
//             EVENT_OUTER1_C: 'C',
//           },
//         },
//         B: {
//           entry: [raise({ type: 'TURN_ON' })],
//           on: {
//             EVENT_OUTER1_A: 'A',
//             EVENT_OUTER1_C: 'C',
//           },
//         },
//         C: {
//           entry: [raise({ type: 'CLEAR' })],
//           on: {
//             EVENT_OUTER1_A: 'A',
//             EVENT_OUTER1_B: 'B',
//           },
//         },
//       },
//     },
//     OUTER2: {
//       type: 'parallel',
//       states: {
//         INNER1: {
//           initial: 'ON',
//           states: {
//             OFF: {
//               on: {
//                 TURN_ON: 'ON',
//               },
//             },
//             ON: {
//               on: {
//                 CLEAR: 'OFF',
//               },
//             },
//           },
//         },
//         INNER2: {
//           initial: 'OFF',
//           states: {
//             OFF: {
//               on: {
//                 TURN_ON: 'ON',
//               },
//             },
//             ON: {
//               on: {
//                 TURN_OFF: 'OFF',
//               },
//             },
//           },
//         },
//       },
//     },
//   },
// });
//
// const nestedParallelState = createMachine({
//   /** @xstate-layout N4IgpgJg5mDOIC5QAoC2BDAxgCwJYDswBKAOgHkBVAFQFEAlARhIGUqBBWgfTIDEeBiGgDUaAOSqcAwmQCyABQAyNABoBtAAwBdRKAAOAe1i4ALrn34dIAB6IAtAHYATABYSz+wFZHAZg8eAHPYAnABsXgA0IACeiI4BJN7ODP4hIe4u3kEeIQC+OZFoWHiEpJS0jCzsXLwCwmISzACS8koa2kggBkam5pY2CLZBDExxyR7O3okeid6RMQhx-glJKWlOE1m5+SCFOATE5NT0TKwcNNyilWec4gBS6ldcjQAiSpzqgiLinKdcd+qcADqZDoAGk2pYuiYzBYOv1bGkll5Mv51I4Qmj0SE5ogQt4Hr4JikghMwv5vHkChg9iVDuUTlVzmRLr9zv9HudgWDGqIAOLvT71H6Mm5Ue6cF6tLSQwzQ3pwux4jwkdTTIIuVIkzE4hABB5efwpcb2eyTIJBSk7anFA5lY4ci4Ou4M66S84MQXfVmi24MIEg8HSjpQnqw0DwsKOEhxZzODwmobZEL2HXkoIJRzk9zeRwkyb+S27G2lI4Vb3Mp1il1cLmgnn8j11L0i50S140CHB2WhvqK7xLez+InZBhDBjqZw6wfpjxo-yLPHDcaF637EvlKPlvieiTSFoqTt6bsw3sLDzpkK59TeBiJWOONGT6KIcdLOL2ZOhdFDy8roprul6E3EUah3H5mkUDsgyPboTwVAZxhIc91VNEJQm8NJ1BJHV8XTBg0McBhsmcdUsiHPJtnwfQIDgSwizXGVYPlcM7HHdR7GjDwxgmKYZh1BEQgSQ0GBIhgTQmTMC22ejaTtRhGLlMNrDsLJ01GfxxkmOM+OfBBMjcIYgnsLD1TjYk-xpW1S2rJk+AUnt4NsfwsmWCc0SIvFEx1Bh0RIfwRMNexnHJftgvsCzi0AssQNEey4JYgYgnUQTEjcwjskyIidWcVU-PJNEkvUW9vBNCKALkmzHW9f44uY5SBg0pZUpy9LPKy3SSO8aNVRJJxMnzKSqX-WTrIdCtqrFB5vTdd5aqU+F-IJHKWo8zKPB1AJBMcQdnAfIIpljLYhss9d7XLFkW0mh1a3rWauyY+a7H7ZVz12wznDCWcMI2w0SBNIc9oOj6ypG+kxou65nTm08nPiZr3IyrzdOMqMxPNdjLy4kTnBBqywfOytfQdGaGGhxzFtclbEfa+ZgmVOIfH8nNrwfBhcdO6LrnGy6ie9G6+U4Un7sUmHMrcRJb3GVJkvnbFkaMv7kSZh9mbZ6TV1BoCyYS2xxyjZDtow9C0gYHUHxIfb3GTG9En23MjqtYa8aAsa7OFhyEp8rqiI-AJMiK9VZl04ZXCHVUQiHMTQtvdmouArnRHA-dtfq5IHnRVVb1jLwSQiYOJ3TDShicedHEI5zY7k+PqkTvdIOUFP+mGVH4zJf3Rx8HD9ot9RAjLvwSXnQbHZOuPwakWR6+J0RRGORuXwxEgfbbpKO6D+ZgpGG9EXxGZPHC9WnY56umVryelGUafZ856o3ZgkX4IfJZl791fA42iOkPGb+CumNJK9LCfC4E99yX2mjPM6MV54LGGEJXwppYzYwxHLeYl4OITiSHOQiEdggAI3OPOuF8r5a3dvFVOi8X5pgDp3XSaEOLTAwslPq0w-B4JdudEBU9wHXyATUaBT8l6t1ftQ9eiAdp+WyF9WM6EJhsLoLws+oDiHyPBvw2B-Z4F3iQclVMExljIJ8kkQcAQKI5CAA */
//   type: 'parallel',
//   states: {
//     OUTER1: {
//       initial: 'STATE_OFF',
//       states: {
//         STATE_OFF: {
//           on: {
//             EVENT_COMPLEX: 'STATE_ON',
//             EVENT_SIMPLE: 'STATE_ON',
//           },
//         },
//         STATE_ON: {
//           type: 'parallel',
//           states: {
//             STATE_NTJ0: {
//               initial: 'STATE_IDLE_0',
//               states: {
//                 STATE_IDLE_0: {
//                   on: {
//                     EVENT_STATE_NTJ0_WORK: 'STATE_WORKING_0',
//                   },
//                 },
//                 STATE_WORKING_0: {
//                   on: {
//                     EVENT_STATE_NTJ0_IDLE: 'STATE_IDLE_0',
//                   },
//                 },
//               },
//             },
//             STATE_NTJ1: {
//               initial: 'STATE_IDLE_1',
//               states: {
//                 STATE_IDLE_1: {
//                   on: {
//                     EVENT_STATE_NTJ1_WORK: 'STATE_WORKING_1',
//                   },
//                 },
//                 STATE_WORKING_1: {
//                   on: {
//                     EVENT_STATE_NTJ1_IDLE: 'STATE_IDLE_1',
//                   },
//                 },
//               },
//             },
//           },
//         },
//       },
//     },
//     OUTER2: {
//       initial: 'STATE_OFF',
//       states: {
//         STATE_OFF: {
//           on: {
//             EVENT_COMPLEX: 'STATE_ON_COMPLEX',
//             EVENT_SIMPLE: 'STATE_ON_SIMPLE',
//           },
//         },
//         STATE_ON_SIMPLE: {},
//         STATE_ON_COMPLEX: {
//           type: 'parallel',
//           states: {
//             STATE_INNER1: {
//               initial: 'STATE_OFF',
//               states: {
//                 STATE_OFF: {},
//                 STATE_ON: {},
//               },
//             },
//             STATE_INNER2: {
//               initial: 'STATE_OFF',
//               states: {
//                 STATE_OFF: {},
//                 STATE_ON: {},
//               },
//             },
//           },
//         },
//       },
//     },
//   },
// });
//
// const deepFlatParallelMachine = createMachine({
//   type: 'parallel',
//   states: {
//     X: {},
//     V: {
//       initial: 'A',
//       on: {
//         a: {
//           target: 'V.A',
//         },
//         b: {
//           target: 'V.B',
//         },
//         c: {
//           target: 'V.C',
//         },
//       },
//       states: {
//         A: {},
//         B: {
//           initial: 'BB',
//           states: {
//             BB: {
//               type: 'parallel',
//               states: {
//                 BBB_A: {},
//                 BBB_B: {},
//               },
//             },
//           },
//         },
//         C: {},
//       },
//     },
//   },
// });
//
// describe('parallel states', () => {
//   it('should have initial parallel states', () => {
//     const initialState = createActor(wordMachine).getSnapshot();
//
//     expect(initialState.value).toEqual({
//       bold: 'off',
//       italics: 'off',
//       underline: 'off',
//       list: 'none',
//     });
//   });
//
//   const expected: Record<string, Record<string, StateValue>> = {
//     '{"bold": "off"}': {
//       TOGGLE_BOLD: {
//         bold: 'on',
//         italics: 'off',
//         underline: 'off',
//         list: 'none',
//       },
//     },
//     '{"bold": "on"}': {
//       TOGGLE_BOLD: {
//         bold: 'off',
//         italics: 'off',
//         underline: 'off',
//         list: 'none',
//       },
//     },
//     [JSON.stringify({
//       bold: 'off',
//       italics: 'off',
//       underline: 'on',
//       list: 'bullets',
//     })]: {
//       'TOGGLE_BOLD, TOGGLE_ITALICS': {
//         bold: 'on',
//         italics: 'on',
//         underline: 'on',
//         list: 'bullets',
//       },
//       RESET: {
//         bold: 'off',
//         italics: 'off',
//         underline: 'off',
//         list: 'none',
//       },
//     },
//   };
//
//   it('should have all parallel states represented in the state value', () => {
//     const machine = createMachine({
//       type: 'parallel',
//       states: {
//         wak1: {
//           initial: 'wak1sonA',
//           states: {
//             wak1sonA: {},
//             wak1sonB: {},
//           },
//           on: {
//             WAK1: '.wak1sonB',
//           },
//         },
//         wak2: {
//           initial: 'wak2sonA',
//           states: {
//             wak2sonA: {},
//           },
//         },
//       },
//     });
//     const actorRef = createActor(machine).start();
//     actorRef.send({ type: 'WAK1' });
//
//     expect(actorRef.getSnapshot().value).toEqual({
//       wak1: 'wak1sonB',
//       wak2: 'wak2sonA',
//     });
//   });
//
//   it('should work with regions without states', () => {
//     expect(createActor(flatParallelMachine).getSnapshot().value).toEqual({
//       foo: {},
//       bar: {},
//       baz: 'one',
//     });
//   });
//
//   it('should work with regions without states', () => {
//     const actorRef = createActor(flatParallelMachine).start();
//     actorRef.send({ type: 'E' });
//     expect(actorRef.getSnapshot().value).toEqual({
//       foo: {},
//       bar: {},
//       baz: 'two',
//     });
//   });
//
//   it('should properly transition to relative substate', () => {
//     const actorRef = createActor(composerMachine).start();
//     actorRef.send({
//       type: 'singleClickActivity',
//     });
//
//     expect(actorRef.getSnapshot().value).toEqual({
//       ReadOnly: {
//         StructureEdit: {
//           SelectionStatus: 'SelectedActivity',
//           ClipboardStatus: 'Empty',
//         },
//       },
//     });
//   });
//
//   it('should properly transition according to entry events on an initial state', () => {
//     const machine = createMachine({
//       type: 'parallel',
//       states: {
//         OUTER1: {
//           initial: 'B',
//           states: {
//             A: {},
//             B: {
//               entry: raise({ type: 'CLEAR' }),
//             },
//           },
//         },
//         OUTER2: {
//           type: 'parallel',
//           states: {
//             INNER1: {
//               initial: 'ON',
//               states: {
//                 OFF: {},
//                 ON: {
//                   on: {
//                     CLEAR: 'OFF',
//                   },
//                 },
//               },
//             },
//             INNER2: {
//               initial: 'OFF',
//               states: {
//                 OFF: {},
//                 ON: {},
//               },
//             },
//           },
//         },
//       },
//     });
//     expect(createActor(machine).getSnapshot().value).toEqual({
//       OUTER1: 'B',
//       OUTER2: {
//         INNER1: 'OFF',
//         INNER2: 'OFF',
//       },
//     });
//   });
//
//   it('should properly transition when raising events for a parallel state', () => {
//     const actorRef = createActor(raisingParallelMachine).start();
//     actorRef.send({
//       type: 'EVENT_OUTER1_B',
//     });
//
//     expect(actorRef.getSnapshot().value).toEqual({
//       OUTER1: 'B',
//       OUTER2: {
//         INNER1: 'ON',
//         INNER2: 'ON',
//       },
//     });
//   });
//
//   it('should handle simultaneous orthogonal transitions', () => {
//     type Events = { type: 'CHANGE'; value: string } | { type: 'SAVE' };
//     const simultaneousMachine = createMachine({
//       /** @xstate-layout N4IgpgJg5mDOIC5QE8CGBbANgUQgSwBcB7AJwDpJC8A7KAYgGEAJAQQDkBxbAbQAYBdRKAAORWFSLUhIAB6IAjAA4AzGWWKATMoDs2gCyLtG+b20A2ADQhkiRfLIbTGzXoCc7s670aAvj6toWLiEpGSwBKgEAK6wZFHUsKgAbpB0AMosAGo8AtKi4gR4ktJyCPKuGmQArEpmZvLKeka8plUBiMpVrmRKRoqunVXKyryNfgEYOPjE5OGRMWHJqczsXHyCSCD5ElKbpeWVNYp1DU2Ore0II90aGvV6Xbe88lVVfv4g1EQQcNKBUyESHkxDsSogALQaPSXcFVMiuRQtZ6jcrKCpQ8bWSbBGYUaY0KDAgpFXagUo1MhmXh2MyKB7U+RmNGXEyqJm8LTaDnKMyvHSY-440JzaLwTbbQrFPaIKGXW6VUaKOkabTKeR6RmuMwC7HTYURUVxBJLCBE0HShBGS5quG8bx6dTuZxKxQ6oJ62YGhaJFKm8UgyWk2QdcpkLlVUzPOw8xzKa3ybTVe2Oiou7TvHxAA */
//       types: {} as { context: { value: string }; events: Events },
//       id: 'yamlEditor',
//       type: 'parallel',
//       context: {
//         value: '',
//       },
//       states: {
//         editing: {
//           on: {
//             CHANGE: {
//               actions: assign({
//                 value: ({ event }) => event.value,
//               }),
//             },
//           },
//         },
//         status: {
//           initial: 'unsaved',
//           states: {
//             unsaved: {
//               on: {
//                 SAVE: {
//                   target: 'saved',
//                   actions: 'save',
//                 },
//               },
//             },
//             saved: {
//               on: {
//                 CHANGE: 'unsaved',
//               },
//             },
//           },
//         },
//       },
//     });
//
//     const actorRef = createActor(simultaneousMachine).start();
//     actorRef.send({
//       type: 'SAVE',
//     });
//     actorRef.send({
//       type: 'CHANGE',
//       value: 'something',
//     });
//
//     expect(actorRef.getSnapshot().value).toEqual({
//       editing: {},
//       status: 'unsaved',
//     });
//
//     expect(actorRef.getSnapshot().context).toEqual({
//       value: 'something',
//     });
//   });
//
//   it('should execute actions of the initial transition of a parallel region when entering the initial state nodes of a machine', () => {
//     const spy = jest.fn();
//
//     const machine = createMachine({
//       type: 'parallel',
//       states: {
//         a: {
//           initial: {
//             target: 'a1',
//             actions: spy,
//           },
//           states: {
//             a1: {},
//           },
//         },
//       },
//     });
//
//     createActor(machine).start();
//
//     expect(spy).toHaveBeenCalledTimes(1);
//   });
//
//   it('should execute actions of the initial transition of a parallel region when the parallel state is targeted with an explicit transition', () => {
//     const spy = jest.fn();
//
//     const machine = createMachine({
//       initial: 'a',
//       states: {
//         a: {
//           on: {
//             NEXT: 'b',
//           },
//         },
//         b: {
//           type: 'parallel',
//           states: {
//             c: {
//               initial: {
//                 target: 'c1',
//                 actions: spy,
//               },
//               states: {
//                 c1: {},
//               },
//             },
//           },
//         },
//       },
//     });
//
//     const actorRef = createActor(machine).start();
//
//     actorRef.send({ type: 'NEXT' });
//
//     expect(spy).toHaveBeenCalledTimes(1);
//   });
//
//   describe('transitions with nested parallel states', () => {
//     it('should properly transition when in a simple nested state', () => {
//       const actorRef = createActor(nestedParallelState).start();
//       actorRef.send({
//         type: 'EVENT_SIMPLE',
//       });
//       actorRef.send({
//         type: 'EVENT_STATE_NTJ0_WORK',
//       });
//
//       expect(actorRef.getSnapshot().value).toEqual({
//         OUTER1: {
//           STATE_ON: {
//             STATE_NTJ0: 'STATE_WORKING_0',
//             STATE_NTJ1: 'STATE_IDLE_1',
//           },
//         },
//         OUTER2: 'STATE_ON_SIMPLE',
//       });
//     });
//
//     it('should properly transition when in a complex nested state', () => {
//       const actorRef = createActor(nestedParallelState).start();
//       actorRef.send({
//         type: 'EVENT_COMPLEX',
//       });
//       actorRef.send({
//         type: 'EVENT_STATE_NTJ0_WORK',
//       });
//
//       expect(actorRef.getSnapshot().value).toEqual({
//         OUTER1: {
//           STATE_ON: {
//             STATE_NTJ0: 'STATE_WORKING_0',
//             STATE_NTJ1: 'STATE_IDLE_1',
//           },
//         },
//         OUTER2: {
//           STATE_ON_COMPLEX: {
//             STATE_INNER1: 'STATE_OFF',
//             STATE_INNER2: 'STATE_OFF',
//           },
//         },
//       });
//     });
//   });
//
//   // https://github.com/statelyai/xstate/issues/191
//   describe('nested flat parallel states', () => {
//     const machine = createMachine({
//       initial: 'A',
//       states: {
//         A: {
//           on: {
//             'to-B': 'B',
//           },
//         },
//         B: {
//           type: 'parallel',
//           states: {
//             C: {},
//             D: {},
//           },
//         },
//       },
//       on: {
//         'to-A': '.A',
//       },
//     });
//
//     it('should represent the flat nested parallel states in the state value', () => {
//       const actorRef = createActor(machine).start();
//       actorRef.send({
//         type: 'to-B',
//       });
//
//       expect(actorRef.getSnapshot().value).toEqual({
//         B: {
//           C: {},
//           D: {},
//         },
//       });
//     });
//   });
//
//   describe('deep flat parallel states', () => {
//     it('should properly evaluate deep flat parallel states', () => {
//       const actorRef = createActor(deepFlatParallelMachine).start();
//
//       actorRef.send({ type: 'a' });
//       actorRef.send({ type: 'c' });
//       actorRef.send({ type: 'b' });
//
//       expect(actorRef.getSnapshot().value).toEqual({
//         V: {
//           B: {
//             BB: {
//               BBB_A: {},
//               BBB_B: {},
//             },
//           },
//         },
//         X: {},
//       });
//     });
//
//     it('should not overlap resolved state nodes in state resolution', () => {
//       const machine = createMachine({
//         /** @xstate-layout N4IgpgJg5mDOIC5QAcCWywBtUDswDoAzAe2IGIBVABQBEBBAFQFEBtABgF1EVjZUAXVMRzcQAD0QBGAJwBmfGwDsbAKwzFc2YoBMbAGwAaEAE9E0yfkUbJbABxrtsvbb3aAvm6NoM2PPgBGAIYATpS0jKycosi8AkIiSOKIbEamCGweniA4xBBw0ehYuGDRsYLCohIIALTa0tIKqnqSLSqysjLaKqmI1ZKKACz4egMqttq24yrOnR5ehb4EJMSlfOUJoFWyKirDI7KTtmxO9T0I2oq77WySevpsDwMD0nMg3kV+QcGrcRWJVbU1I1pi1JG0OtIumdqrZFPhZNo6pInpIJgM2NI9K93osAiF8KgIJgSokYmt4pVerp5A8Qa12p1uiZEDp8NIXCptDIVAN2jNsQtinjgniAF4-daUhC3fAqHSIvRWaQaaQ7RRnLlsfA2S6uCaKPQjaaZNxAA */
//         id: 'pipeline',
//         type: 'parallel',
//         states: {
//           foo: {
//             on: {
//               UPDATE: {
//                 actions: () => {
//                   /* do nothing */
//                 },
//               },
//             },
//           },
//           bar: {
//             on: {
//               UPDATE: '.baz',
//             },
//             initial: 'idle',
//             states: {
//               idle: {},
//               baz: {},
//             },
//           },
//         },
//       });
//
//       const actorRef = createActor(machine).start();
//       expect(() => {
//         actorRef.send({
//           type: 'UPDATE',
//         });
//       }).not.toThrow();
//     });
//   });
//
//   describe('other', () => {
//     // https://github.com/statelyai/xstate/issues/518
//     it('regions should be able to transition to orthogonal regions', () => {
//       const testMachine = createMachine({
//         /** @xstate-layout N4IgpgJg5mDOIC5QAoC2BDAxgCwJYDswBKAOgFkx8BXEgYQBsB7WSAYgBdGop6wBtAAwBdRKAAOzXO1yN8okAA9EAgDQgAnsoC+WtWix5CpCtRIB5MZTaduvQSKQgJsKTLmOlCVRu26Q+nAJickoaCysIVihGAAJOGIh0WGwAI0Z0ACcIe3lnV1l5TwBGAFYSACYAFhKBEoBOcrqAdgBmFoAOFsrKtU0EEoA2IpJKgXKipvGBJqa69pKdP3xGCDh5AMNiXMlpAo9EAFoWpsqSEqK644aWgaaBZt7DidOB6vby9vfB9ovynT0MIEjCQAAroGDwRx5XbuUCecoDdoVCYDARjeYYlqPBBFUoVOpjKoDcpVBEff7+QGbUhgiEkACCaSo7G2LhhhUQLSKA2RTVR6JKmOx5TGJCGXJaBJaJQRk0qFI2QRp4LgJAAIklUuksqz8rDFJzubz+R9BYKsT4EG0miQimM+QIijd2nMFn5FcCTFRdez9ggjgizhcruUbncHpaDu0bS0SXUit0ih9RnUBgqqUqQqYGMxID63Bz-eUmkjzpdZqHbvcmsKhiRpqiPuVBnbjumDJmveZLIQIPm9nDDsXS8GK2Hq9jJWVBoNKpcSjMus1FlogA */
//         type: 'parallel',
//         states: {
//           Pages: {
//             initial: 'About',
//             states: {
//               About: {
//                 id: 'About',
//               },
//               Dashboard: {
//                 id: 'Dashboard',
//               },
//             },
//           },
//           Menu: {
//             initial: 'Closed',
//             states: {
//               Closed: {
//                 id: 'Closed',
//                 on: {
//                   toggle: 'Opened',
//                 },
//               },
//               Opened: {
//                 id: 'Opened',
//                 on: {
//                   toggle: 'Closed',
//                   'go to dashboard': {
//                     target: ['#Dashboard', '#Opened'],
//                   },
//                 },
//               },
//             },
//           },
//         },
//       });
//
//       const actorRef = createActor(testMachine).start();
//
//       actorRef.send({ type: 'toggle' });
//       actorRef.send({ type: 'go to dashboard' });
//
//       expect(
//         actorRef.getSnapshot().matches({ Menu: 'Opened', Pages: 'Dashboard' })
//       ).toBe(true);
//     });
//
//     // https://github.com/statelyai/xstate/issues/531
//     it('should calculate the entry set for reentering transitions in parallel states', () => {
//       const testMachine = createMachine({
//         types: {} as { context: { log: string[] } },
//         id: 'test',
//         context: { log: [] },
//         type: 'parallel',
//         states: {
//           foo: {
//             initial: 'foobar',
//             states: {
//               foobar: {
//                 on: {
//                   GOTO_FOOBAZ: 'foobaz',
//                 },
//               },
//               foobaz: {
//                 entry: assign({
//                   log: ({ context }) => [...context.log, 'entered foobaz'],
//                 }),
//                 on: {
//                   GOTO_FOOBAZ: {
//                     target: 'foobaz',
//                     reenter: true,
//                   },
//                 },
//               },
//             },
//           },
//           bar: {},
//         },
//       });
//
//       const actorRef = createActor(testMachine).start();
//
//       actorRef.send({
//         type: 'GOTO_FOOBAZ',
//       });
//       actorRef.send({
//         type: 'GOTO_FOOBAZ',
//       });
//
//       expect(actorRef.getSnapshot().context.log.length).toBe(2);
//     });
//   });
//
//   it('should raise a "xstate.done.state.*" event when all child states reach final state', (done) => {
//     const machine = createMachine({
//       id: 'test',
//       initial: 'p',
//       states: {
//         p: {
//           type: 'parallel',
//           states: {
//             a: {
//               initial: 'idle',
//               states: {
//                 idle: {
//                   on: {
//                     FINISH: 'finished',
//                   },
//                 },
//                 finished: {
//                   type: 'final',
//                 },
//               },
//             },
//             b: {
//               initial: 'idle',
//               states: {
//                 idle: {
//                   on: {
//                     FINISH: 'finished',
//                   },
//                 },
//                 finished: {
//                   type: 'final',
//                 },
//               },
//             },
//             c: {
//               initial: 'idle',
//               states: {
//                 idle: {
//                   on: {
//                     FINISH: 'finished',
//                   },
//                 },
//                 finished: {
//                   type: 'final',
//                 },
//               },
//             },
//           },
//           onDone: 'success',
//         },
//         success: {
//           type: 'final',
//         },
//       },
//     });
//
//     const service = createActor(machine);
//     service.subscribe({
//       complete: () => {
//         done();
//       },
//     });
//     service.start();
//
//     service.send({ type: 'FINISH' });
//   });
//
//   it('should raise a "xstate.done.state.*" event when a pseudostate of a history type is directly on a parallel state', () => {
//     const machine = createMachine({
//       initial: 'parallelSteps',
//       states: {
//         parallelSteps: {
//           type: 'parallel',
//           states: {
//             hist: {
//               type: 'history',
//             },
//             one: {
//               initial: 'wait_one',
//               states: {
//                 wait_one: {
//                   on: {
//                     finish_one: {
//                       target: 'done',
//                     },
//                   },
//                 },
//                 done: {
//                   type: 'final',
//                 },
//               },
//             },
//             two: {
//               initial: 'wait_two',
//               states: {
//                 wait_two: {
//                   on: {
//                     finish_two: {
//                       target: 'done',
//                     },
//                   },
//                 },
//                 done: {
//                   type: 'final',
//                 },
//               },
//             },
//           },
//           onDone: 'finished',
//         },
//         finished: {},
//       },
//     });
//
//     const service = createActor(machine).start();
//
//     service.send({ type: 'finish_one' });
//     service.send({ type: 'finish_two' });
//
//     expect(service.getSnapshot().value).toBe('finished');
//   });
//
//   describe('invoke', () => {
//     it('should gradually become permissions actor system', () => {
//       const bluetoothPermissionMachine = setup({
//         actors: {
//           checkPermission: fromPromise(async () => {
//             const result = await Promise.resolve('denied');
//             return assign({ result });
//           }),
//         },
//         actions: {
//           spawnFetcher: assign(({ spawn }) => {
//             return {
//               child: spawn('checkPermission'),
//             };
//           }),
//         },
//         types: {} as {
//           events:
//             | { type: 'FORWARD_DEC' }
//             | { type: 'triggerPermissionRequest' };
//
//           context: {
//             triggered: boolean;
//             child: /*TODO fix type */ any | undefined;
//           };
//         },
//       }).createMachine({
//         context: { triggered: false, child: undefined },
//         initial: 'init',
//         states: {
//           init: {
//             on: {
//               triggerPermissionRequest: {
//                 actions: [
//                   log('triggerPermissionRequest'),
//                   assign({ triggered: true }),
//                   sendTo('child', { type: 'triggerPermissionRequest' }),
//                   //   'checkPermission',
//                 ],
//               },
//               FORWARD_DEC: {
//                 actions: [
//                   sendParent({ type: 'DEC' }),
//                   sendParent({ type: 'DEC' }),
//                   sendParent({ type: 'DEC' }),
//                 ],
//               },
//             },
//           },
//         },
//       });
//
//       const permissionMonitoringMachine = createMachine(
//         {
//           id: 'parent',
//           types: {} as {
//             context: { count: number };
//             actors: {
//               src: 'bluetoothPermission';
//               logic: typeof bluetoothPermissionMachine;
//             };
//           },
//           context: { count: 0 },
//           initial: 'start',
//           states: {
//             start: {
//               invoke: {
//                 src: 'bluetoothPermission',
//                 id: 'bluetoothPermissionId',
//               },
//               always: {
//                 target: 'stop',
//                 guard: ({ context }) => context.count === -3,
//               },
//               on: {
//                 DEC: {
//                   actions: assign({
//                     count: ({ context }) => context.count - 1,
//                   }),
//                 },
//                 FORWARD_DEC: {
//                   actions: sendTo('bluetoothPermissionId', {
//                     type: 'triggerPermissionRequest',
//                   }),
//                 },
//               },
//             },
//             stop: {
//               type: 'final',
//             },
//           },
//         },
//         {
//           actors: {
//             bluetoothPermission: bluetoothPermissionMachine,
//           },
//         }
//       );
//
//       const actorRef = createActor(permissionMonitoringMachine).start();
//       actorRef.send({ type: 'FORWARD_DEC' });
//
//       // 1. The 'parent' machine will not do anything (inert transition)
//       // 2. The 'FORWARD_DEC' event will be "forwarded" to the child machine
//       // 3. On the child machine, the 'FORWARD_DEC' event sends the 'DEC' action to the parent thrice
//       // 4. The context of the 'parent' machine will be updated from 0 to -3
//       //   expect(actorRef.getSnapshot().context).toEqual({ count: -3 });
//       // expect(
//       //   actorRef.getSnapshot().children.bluetoothPermissionId?.getSnapshot()
//       //     .context
//       // ).toEqual({
//       //   triggered: true,
//       //   result: 'something',
//       // });
//     });
//   });
// });
//
// /*
// Prompt for LLM:
//
// Given these passing tests for xstate invoke and xstate parallel machines, can you please answer my following questions?
//
// 1) please create a test to see whether it is possible to do the following:
// create a parallel machine with 2 parallel states
// in state 1, raise an event to the "parent" machine that will be handled by two invoked actors in the second parallel state.
// write a complete test in this style, I will report the findings of the test to the LLM and we can iterate.
// */
//
// // claude
//
// // describe('assumptions', () => {
// //   it('should support parallel states', () => {
// //     const parallelMachine = createMachine({
// //       id: 'parent',
// //       type: 'parallel',
// //       states: {
// //         state1: {},
// //         state2: {},
// //       },
// //     });
//
// //     const actorRef = createActor(parallelMachine).start();
//
// //     expect(actorRef.getSnapshot().value).toEqual({
// //       state1: {},
// //       state2: {},
// //     });
// //   });
//
// //   it('should support invoking child machines', () => {
// //     const childMachine = createMachine({
// //       id: 'child',
// //       initial: 'idle',
// //       states: {
// //         idle: {},
// //       },
// //     });
//
// //     const parentMachine = createMachine({
// //       id: 'parent',
// //       initial: 'active',
// //       states: {
// //         active: {
// //           invoke: {
// //             id: 'child',
// //             src: childMachine,
// //           },
// //         },
// //       },
// //     });
//
// //     const actorRef = createActor(parentMachine).start();
//
// //     expect(actorRef.getSnapshot().value).toEqual({
// //       active: {
// //         child: 'idle',
// //       },
// //     });
// //   });
//
// //   it('should support sending events from child to parent', () => {
// //     const childMachine = createMachine({
// //       id: 'child',
// //       initial: 'idle',
// //       states: {
// //         idle: {
// //           on: {
// //             PING: {
// //               actions: sendParent({ type: 'PING_RECEIVED' }),
// //             },
// //           },
// //         },
// //       },
// //     });
//
// //     const parentMachine = createMachine({
// //       id: 'parent',
// //       initial: 'active',
// //       states: {
// //         active: {
// //           invoke: {
// //             id: 'child',
// //             src: childMachine,
// //           },
// //           on: {
// //             PING_RECEIVED: 'pinged',
// //           },
// //         },
// //         pinged: {},
// //       },
// //     });
//
// //     const actorRef = createActor(parentMachine).start();
//
// //     actorRef.send({ type: 'PING' });
//
// //     expect(actorRef.getSnapshot().value).toEqual('pinged');
// //   });
//
// //   it('should support sending events from parent to child', () => {
// //     const childMachine = createMachine({
// //       id: 'child',
// //       initial: 'idle',
// //       states: {
// //         idle: {
// //           on: {
// //             PING: 'pinged',
// //           },
// //         },
// //         pinged: {},
// //       },
// //     });
//
// //     const parentMachine = createMachine({
// //       id: 'parent',
// //       initial: 'active',
// //       states: {
// //         active: {
// //           invoke: {
// //             id: 'child',
// //             src: childMachine,
// //           },
// //           on: {
// //             SEND_PING: {
// //               actions: sendTo('child', 'PING'),
// //             },
// //           },
// //         },
// //       },
// //     });
//
// //     const actorRef = createActor(parentMachine).start();
//
// //     actorRef.send({ type: 'SEND_PING' });
//
// //     expect(actorRef.getSnapshot().value).toEqual({
// //       active: {
// //         child: 'pinged',
// //       },
// //     });
// //   });
// // });
//
// it('should be able to communicate with the parent using params', () => {
//   type ParentEvent = { type: 'FOO' } | { type: 'triggerFlob' };
//
//   const childMachine = setup({
//     types: {} as {
//       input: {
//         parent?: ActorRef<Snapshot<unknown>, ParentEvent>;
//       };
//       context: {
//         parent?: ActorRef<Snapshot<unknown>, ParentEvent>;
//       };
//     },
//     actions: {
//       mySendParent: enqueueActions(
//         ({ context, enqueue }, event: ParentEvent) => {
//           if (!context.parent) {
//             // it's here just for illustration purposes
//             console.log(
//               'WARN: an attempt to send an event to a non-existent parent'
//             );
//             return;
//           }
//           enqueue.sendTo(context.parent, event);
//         }
//       ),
//     },
//   }).createMachine({
//     context: ({ input }) => ({ parent: input.parent }),
//
//     on: {
//       flob: {
//         actions: {
//           type: 'mySendParent',
//           params: {
//             type: 'FOO',
//           },
//         },
//       },
//     },
//   });
//
//   const spy = jest.fn();
//
//   const parentMachine = setup({
//     types: {} as { context: { foo: string }; events: ParentEvent },
//     actors: {
//       childMachine,
//     },
//   }).createMachine({
//     context: { foo: 'bar' },
//     on: {
//       FOO: {
//         actions: spy,
//       },
//       triggerFlob: {
//         actions: [
//           assign({ foo: 'baz' }),
//           /*        don't format      */
//           sendTo('someChild', { type: 'flob' }),
//         ],
//       },
//     },
//     invoke: {
//       src: 'childMachine',
//       id: 'someChild',
//       input: ({ self }) => ({ parent: self }),
//     },
//   });
//
//   const actorRef = createActor(parentMachine).start();
//   actorRef.send({ type: 'triggerFlob' });
//   expect(actorRef.getSnapshot().context).toEqual({ foo: 'baz' });
//
//   expect(spy).toHaveBeenCalledTimes(1);
// });
//
// it.skip('should handle events raised from one parallel state by invoking actors in another parallel state', () => {
//   const childMachine1 = createMachine({
//     id: 'child1',
//     initial: 'idle',
//     states: {
//       idle: {
//         on: {
//           PING: {
//             actions: [
//               sendParent({ type: 'PING_RECEIVED' }),
//               () => console.log('Child1: Sent PING_RECEIVED event to parent'),
//             ],
//           },
//         },
//       },
//     },
//   });
//
//   const childMachine2 = createMachine({
//     id: 'child2',
//     initial: 'waiting',
//     states: {
//       waiting: {
//         on: {
//           PING_RECEIVED: {
//             target: 'pinged',
//             actions: () =>
//               console.log(
//                 'Child2: Received PING_RECEIVED event, transitioning to pinged state'
//               ),
//           },
//         },
//       },
//       pinged: {
//         type: 'final',
//       },
//     },
//   });
//
//   const parentMachine = createMachine({
//     /** @xstate-layout N4IgpgJg5mDOIC5QAcCGAnMA7ALgYgAUBJAOQHEB9AJQFEBhGogNRoBEBtABgF1EUB7WAEscQ-lj4gAHogC0ARgCcAJgB0nAGwBWAOwAWZfKVH5OgDQgAnonmctqjY+0Bmec+06jOgL7eLaTFxCUjIuXiQQZEERMQkImQRnZ0VVVz09Uy09LQ0ADi1FDQtrBHks1WU9RWcMjSNOHVy7Xz8QLH4IOEkA7Bxu6NFxSQSFRWLEZ2U1DSnkgvdKnS1nX38MXtVYHFQcMHl+4UG40AS9cytEPU4UxWzXOy15A0UdH1ae3E3t3eUDmKH4ohlGMLggqjoKho9K4ZnYlkYVu91p8tjswGpUABjHD8dD7CJRQ6xYaIV7jBBaXJ6VSUnTKGY6RzOTiTVaRZE4L5ojHY3G-AkDYmAhBk0F5G6aelU5SS7ItbxAA */
//     id: 'parent',
//     type: 'parallel',
//     states: {
//       state1: {
//         invoke: {
//           id: 'child1',
//           src: childMachine1,
//         },
//       },
//       state2: {
//         type: 'parallel',
//         states: {
//           actor1: {
//             invoke: {
//               id: 'child2_1',
//               src: childMachine2,
//             },
//           },
//           actor2: {
//             invoke: {
//               id: 'child2_2',
//               src: childMachine2,
//             },
//           },
//         },
//       },
//     },
//     on: {
//       PING_RECEIVED: {
//         actions: [
//           sendTo('child1', { type: 'PING_RECEIVED' }),
//           sendTo('child2_1', { type: 'PING_RECEIVED' }),
//           sendTo('child2_2', { type: 'PING_RECEIVED' }),
//           () =>
//             console.log(
//               'Parent: Received PING_RECEIVED event, sending it to child2 actors'
//             ),
//         ],
//       },
//       PING: {
//         // send this to child2_1 and child2_2
//         actions: [
//           () => console.log('Parent: Sent PING event to child2 actors'),
//           sendTo('child2_1', { type: 'PING_RECEIVED' }),
//           sendTo('child2_2', { type: 'PING_RECEIVED' }),
//         ],
//       },
//     },
//   });
//
//   const actorRef = createActor(parentMachine).start();
//
//   // Initial state
//   console.log('Initial state:', actorRef.getSnapshot().value);
//   // Expected output:
//   // Initial state: {
//   //   state1: {},
//   //   state2: {
//   //     actor1: 'waiting',
//   //     actor2: 'waiting'
//   //   }
//   // }
//
//   // Send 'PING' event to child1
//   actorRef.send({ type: 'PING' });
//
//   // After sending 'PING' event
//   console.log('After sending PING event:', actorRef.getSnapshot().value);
//   // Expected output:
//   // After sending PING event: {
//   //   state1: {},
//   //   state2: {
//   //     actor1: 'pinged',
//   //     actor2: 'pinged'
//   //   }
//   // }
//
//   expect(actorRef.getSnapshot().value).toEqual({
//     state1: {},
//     state2: {
//       actor1: 'pinged',
//       actor2: 'pinged',
//     },
//   });
// });
//
// it('should return actions for parallel machines', () => {
//   const actual: string[] = [];
//   const machine = setup({}).createMachine({
//     type: 'parallel',
//     states: {
//       permission: {
//         on: {
//           foo: {
//             target: '.a2',
//           },
//         },
//         initial: 'a1',
//         states: {
//           a1: {
//             on: {
//               CHANGE: {
//                 target: 'a2',
//                 actions: [
//                   () => actual.push('do_a2'),
//                   () => actual.push('another_do_a2'),
//                 ],
//               },
//             },
//             entry: () => actual.push('enter_a1'),
//             exit: () => actual.push('exit_a1'),
//           },
//           a2: {
//             entry: () => actual.push('enter_a2'),
//             exit: () => actual.push('exit_a2'),
//           },
//         },
//         entry: () => actual.push('enter_a'),
//         exit: () => actual.push('exit_a'),
//       },
//       b: {
//         initial: 'b1',
//         states: {
//           b1: {
//             on: {
//               CHANGE: { target: 'b2', actions: () => actual.push('do_b2') },
//             },
//             entry: () => actual.push('enter_b1'),
//             exit: () => actual.push('exit_b1'),
//           },
//           b2: {
//             entry: () => actual.push('enter_b2'),
//             exit: () => actual.push('exit_b2'),
//           },
//         },
//         entry: () => actual.push('enter_b'),
//         exit: () => actual.push('exit_b'),
//       },
//     },
//   });
//
//   const actor = createActor(machine).start();
//   expect(actor.getSnapshot().value).toStrictEqual({
//     permission: 'a1',
//     b: 'b1',
//   });
//
//   actor.send({ type: 'foo' });
//   expect(actor.getSnapshot().value).toStrictEqual({
//     permission: 'a2',
//     b: 'b1',
//   });
//
//   // actual.length = 0;
//
//   // actor.send({ type: 'CHANGE' });
//
//   // expect(actual).toEqual([
//   //   'exit_b1', // reverse document order
//   //   'exit_a1',
//   //   'do_a2',
//   //   'another_do_a2',
//   //   'do_b2',
//   //   'enter_a2',
//   //   'enter_b2',
//   // ]);
// });
