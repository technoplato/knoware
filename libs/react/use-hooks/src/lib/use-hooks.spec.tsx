import { render } from '@testing-library/react';

import UseHooks from './use-hooks';

describe('UseHooks', () => {
  it('should render successfully', () => {
    const { baseElement } = render(<UseHooks />);
    expect(baseElement).toBeTruthy();
  });
});
