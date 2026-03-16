import { TestBed } from '@angular/core/testing';

import { Ai } from './ai';

describe('Ai', () => {
  let service: Ai;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Ai);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
