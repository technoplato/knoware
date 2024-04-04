const prettyMuchForever = Math.pow(2, 31) - 1;

export type SimpleInspectorOptions = {
  onLiveInspectActive?: (url: string) => Promise<void>;
};

export function createSimpleInspector(options: SimpleInspectorOptions = {}) {
  const { onLiveInspectActive } = options;
  const liveInspectUrl = 'https://example.com/inspect/session123';

  // Simulate the WebSocket onopen event with a promise that resolves after 500ms
  const socketOpenPromise = new Promise<void>((resolve) => {
    setTimeout(() => {
      console.log('WebSocket opened');
      resolve();
    }, 500);
  });

  // Return an object with a method to wait for the live inspect session to be active
  return {
    waitForLiveInspectActive: async () => {
      await socketOpenPromise;
      if (onLiveInspectActive) {
        await onLiveInspectActive(liveInspectUrl);
      }
    },
  };
}

// describe('createSkyInspector', () => {
//   it(
//     /* ⚠️failing attempt to debug with stately sky*/ 'should wait for the live inspect session to be active',
//     async () => {
//       const mockCallback = jest.fn();
//
//       const { waitForLiveInspectActive, inspector } = createSkyInspector({
//         onLiveInspectActive: async (url) => {
//           await new Promise((resolve) => setTimeout(resolve, 1000));
//           mockCallback(url);
//         },
//       });
//
//       // Call the waitForLiveInspectActive function without awaiting its completion
//       const waitPromise = waitForLiveInspectActive();
//
//       // Assert that the inspector object is created
//       expect(inspector).toBeDefined();
//
//       // Wait for a short time (less than the WebSocket open delay and callback delay)
//       await new Promise((resolve) => setTimeout(resolve, 300));
//
//       // Assert that the callback has not been called yet
//       expect(mockCallback).not.toHaveBeenCalled();
//
//       // Wait for the waitForLiveInspectActive promise to resolve
//       /* ✅This is properly being awaited*/ await waitPromise;
//
//       // Assert that the callback has been called with the correct URL
//       // expect(mockCallback).toHaveBeenCalledWith(
//       //   'https://stately.ai/inspect/session123'
//       // );
//
//       const countingActor = createActor(countingMachineThatNeedsPermissionAt3, {
//         inspect: inspector.inspect,
//       }).start();
//
//       /* 🤔 If I set a brekapoint here, then the inspector won't "connect" until the promise at the bottom*/ countingActor.send(
//         { type: 'count.inc' }
//       );
//       countingActor.send({ type: 'count.inc' });
//       countingActor.send({ type: 'count.inc' });
//       countingActor.send({ type: 'count.inc' });
//       expect(countingActor.getSnapshot().context.count).toBe(3);
//       expect(countingActor.getSnapshot().value).toStrictEqual({
//         counting: 'disabled',
//         handlingPermissions: 'active',
//       });
//
//       await new Promise((resolve) => setTimeout(resolve, prettyMuchForever));
//     },
//     prettyMuchForever
//   );
// });

describe('createSimpleInspector', () => {
  it('should wait for the live inspect session to be active', async () => {
    const mockCallback = jest.fn();

    const inspector = createSimpleInspector({
      onLiveInspectActive: async (url) => {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        mockCallback(url);
      },
    });

    // Call the waitForLiveInspectActive method without awaiting its completion
    const waitPromise = inspector.waitForLiveInspectActive();

    // Wait for a short time (less than the WebSocket open delay and callback delay)
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Assert that the callback has not been called yet
    expect(mockCallback).not.toHaveBeenCalled();

    // Wait for the waitForLiveInspectActive promise to resolve
    await waitPromise;

    // Assert that the callback has been called with the correct URL
    expect(mockCallback).toHaveBeenCalledWith(
      'https://example.com/inspect/session123'
    );
  });
});
