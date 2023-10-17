import { machines } from './machines';

describe('machines', () => {
  it('should work', () => {
    expect(machines()).toEqual(
      'this even hot updates from a running android app'
    );
  });
});
