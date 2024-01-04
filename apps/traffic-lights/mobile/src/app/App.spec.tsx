import React from 'react';
import { createMachine, createActor, SimulatedClock } from 'xstate';

const level001LogicMachine = createMachine({
  meta: {
    chat: {
      private: 'https://chat.openai.com/c/8d465ffd-ba0a-4f02-ad99-5cb42e099ec1',
      public: {
        '73ca418081051789bb066f6eddba81646a789524':
          'https://chat.openai.com/share/79d82d80-93b0-4af7-99c0-bf15b4f36cc2',
      },
    },
    translations: {
      en: {
        title: 'Level 001',
      },
      jp: {
        title: 'レベル 001',
      },
    },
  },
  context: {
    locale: 'en',
  },
  description:
    'The objective of Level 001 is to exhibit patience and to learn about time. A player can win level 001 by simply waiting for three (3) seconds without doing anything',
  id: 'Level001Logic',
  initial: 'Initial',
  states: {
    Initial: {
      always: { target: 'Countdown' },
    },
    Countdown: {
      after: {
        3000: { target: 'Completed' },
      },
      on: {
        INTERACT: 'Reset',
      },
    },
    Reset: {
      always: { target: 'RestartCountdown' },
    },
    RestartCountdown: {
      description: `
This intermediate step is required from our observation that if you attempt to
transition back to Countdown from Reset, something funky happens and the timeout
no longer works as expected.
      `,
      always: { target: 'Countdown' },
    },
    Completed: {
      type: 'final',
    },
  },
});

describe('level 001', () => {
  test('should transition to completed after 3 seconds of inactivity', () => {
    const simulatedClock = new SimulatedClock();

    const gameStateActor = createActor(level001LogicMachine, {
      clock: simulatedClock,
    }).start();

    // Fast-forward time by 3 seconds
    simulatedClock.increment(3000);

    // Check if the state has transitioned to Completed
    expect(gameStateActor.getSnapshot().matches('Completed')).toBeTruthy();
  });

  test('should reset to countdown on interaction and then complete succesfully after no interaction', () => {
    const simulatedClock = new SimulatedClock();
    const gameStateActor = createActor(level001LogicMachine, {
      clock: simulatedClock,
    }).start();

    // Initial state
    console.log('Initial State:', gameStateActor.getSnapshot().value);

    // Simulate user interaction after 1 second
    simulatedClock.increment(1000);
    gameStateActor.send({ type: 'INTERACT' });
    console.log('State after interaction:', gameStateActor.getSnapshot().value);

    // Simulate 2 seconds passing after reset, and ensure that the machine has not completed
    simulatedClock.increment(2000);
    expect(gameStateActor.getSnapshot().value !== 'Completed').toBeTruthy();

    // Simulate the final 1 second of the three passing, letting the user through
    simulatedClock.increment(1000);

    console.log('Final State:', gameStateActor.getSnapshot().value);

    // Check for successful completion
    expect(gameStateActor.getSnapshot().value === 'Completed').toBeTruthy();
  });
});
