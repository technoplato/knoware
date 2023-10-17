import { render } from '@testing-library/react';

import SkyMachines from './sky-machines';

describe('SkyMachines', () => {
  it('should render successfully', () => {
    const { baseElement } = render(<SkyMachines />);
    expect(baseElement).toBeTruthy();
  });
});
