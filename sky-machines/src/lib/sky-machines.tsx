import React from 'react';

export const useFoo = () => {
  const [state, setState] = React.useState(0);

  return [state, setState];
};
