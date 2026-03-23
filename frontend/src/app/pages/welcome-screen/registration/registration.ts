import { CommonModule } from '@angular/common';
import { Component, signal, output, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Input } from '@angular/core';
import { OnInit } from '@angular/core';

@Component({
  selector: 'app-registration',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './registration.html',
  styleUrl: './registration.css',
})
export class Registration {
  initialEmail = input<string>('');
  email = '';
  confirmEmail = '';
  initialPassword = input<string>('');
  password = '';
  confirmPassword = '';
  termsAccepted = false;
  errorMessage = signal('');
  register() {
    if (this.email !== this.confirmEmail) {
      this.errorMessage.set('Adresy email nie są zgodne.');
      return;
    }
    if (this.password !== this.confirmPassword) {
      this.errorMessage.set('Hasła nie są zgodne.');
      return;
    }
    if (!this.termsAccepted) {
      this.errorMessage.set('Musisz zaakceptować regulamin.');
      return;
    }
    // Tutaj można dodać logikę rejestracji, np. wywołanie API
    // Po udanej rejestracji można zamknąć formularz:
    this.closeRegistration();
  }
  close = output<void>();
  closeRegistration(){
    this.close.emit();
  };
  ngOnInit() {
  this.email = this.initialEmail();
  this.password = this.initialPassword();
  }
}