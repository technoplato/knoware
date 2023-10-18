/* eslint-disable jsx-a11y/accessible-emoji */
import React, { useEffect, useState } from 'react';
import { useSkyLightMachine } from '@knoware/sky-machines';
import { useEnsureEventShimsAreLoaded } from '@knoware/use-ensure-event-target-shims';

const Loading = () => {
  return (
    <div style={{ margin: '24px' }}>
      <p>loading</p>
    </div>
  );
};

const GoodStuff = () => {
  const [snapshot, send, actor] = useSkyLightMachine();
  const currentLightcolor = snapshot.value;

  return (
    <div style={{ height: '800px', width: '100%' }}>
      <div
        style={{
          width: '100%',
          height: '50%',
          backgroundColor: currentLightcolor,
        }}
      />
      <div
        style={{
          flex: 0.7,
          backgroundColor: 'black',
          justifyContent: 'flex-start',
          flexDirection: 'column-reverse',
        }}
      >
        {snapshot.nextEvents.map((event) => (
          <button
            style={{ color: 'gray' }}
            onClick={() => send({ type: event })}
            key={event}
          >
            {event}
          </button>
        ))}
      </div>
    </div>
  );
};

export const App = () => {
  const areShimsLoaded = useEnsureEventShimsAreLoaded();

  const Content = areShimsLoaded ? GoodStuff : Loading;

  return (
    <div style={{ flex: 1, backgroundColor: 'black' }}>
      <Content />
    </div>
  );
};

export default App;
