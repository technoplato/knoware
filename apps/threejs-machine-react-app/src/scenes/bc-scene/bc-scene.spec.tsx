import { render } from '@testing-library/react';

import BcScene from './bc-scene';

describe('BcScene', () => {
  it('should render successfully', () => {
    const { baseElement } = render(<BcScene />);
    expect(baseElement).toBeTruthy();
  });
});
