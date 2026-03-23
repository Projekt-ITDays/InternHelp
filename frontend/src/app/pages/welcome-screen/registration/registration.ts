import { CommonModule } from '@angular/common';
import { Component, signal, output } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-registration',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './registration.html',
  styleUrl: './registration.css',
})
export class Registration {
  email = '';
  confirmEmail = '';
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
}