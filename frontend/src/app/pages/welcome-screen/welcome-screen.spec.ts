import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WelcomeScreen } from './welcome-screen';

describe('WelcomeScreen', () => {
  let component: WelcomeScreen;
  let fixture: ComponentFixture<WelcomeScreen>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WelcomeScreen]
    })
    .compileComponents();

    fixture = TestBed.createComponent(WelcomeScreen);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
