import React from 'react';
import { render } from '@testing-library/react-native';

import App from './App';
//
// test('renders correctly', () => {
//   expect(true).toBe(false);
//   // expect(getByTestId('heading')).toHaveTextContent('Welcome');
// });

import { createMachine, createActor, SimulatedClock } from 'xstate';

const gameStateMachine = createMachine({
  id: 'game',
  initial: 'Initial',
  states: {
    Initial: {
      always: {
        target: 'Countdown',
      },
    },
    Countdown: {
      after: {
        3000: { target: 'Completed' },
      },
      on: { INTERACT: 'Reset' },
    },
    Reset: {
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

    const gameStateActor = createActor(gameStateMachine, {
      clock: simulatedClock,
    }).start();

    // Fast-forward time by 3 seconds
    simulatedClock.increment(3000);

    // Check if the state has transitioned to Completed
    expect(gameStateActor.getSnapshot().matches('Completed')).toBeTruthy();
  });

  test.only('should reset to countdown on interaction', () => {
    const simulatedClock = new SimulatedClock();

    const gameStateActor = createActor(gameStateMachine, {
      clock: simulatedClock,
    }).start();

    // Initial state
    console.log('Initial State:', gameStateActor.getSnapshot().value);

    // Simulate user interaction after 1 second
    simulatedClock.increment(1000);
    gameStateActor.send({ type: 'INTERACT' });
    console.log('State after interaction:', gameStateActor.getSnapshot().value);

    // Check if the state has transitioned to Reset
    expect(gameStateActor.getSnapshot().value === 'Reset').toBeTruthy();

    // Simulate 3 seconds passing after reset
    simulatedClock.increment(3000);
    console.log('Final State:', gameStateActor.getSnapshot().value);

    // Check for successful completion
    expect(gameStateActor.getSnapshot().value === 'Completed').toBeTruthy();
  });

  test('should complete successfully after reset', () => {
    const simulatedClock = new SimulatedClock();

    const gameStateActor = createActor(gameStateMachine, {
      clock: simulatedClock,
    }).start();

    // Start the game
    gameStateActor.send('START');

    // Simulate user interaction
    simulatedClock.increment(1500);
    gameStateActor.send('INTERACT');

    // Restart the countdown
    gameStateActor.send('RESTART_COUNTDOWN');

    // Fast-forward time by 3 seconds
    simulatedClock.increment(3000);

    // Check for successful completion
    expect(gameStateActor.getSnapshot().matches('Completed')).toBeTruthy();
  });
});
