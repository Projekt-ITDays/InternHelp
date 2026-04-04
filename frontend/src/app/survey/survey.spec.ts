import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Survey } from './survey';

describe('Survey', () => {
  let component: Survey;
  let fixture: ComponentFixture<Survey>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Survey]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Survey);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
