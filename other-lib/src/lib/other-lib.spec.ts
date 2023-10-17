import { otherLib } from './other-lib';

describe('otherLib', () => {
  it('should work', () => {
    expect(otherLib()).toEqual('I depend on machines and they are: machines');
  });
});
