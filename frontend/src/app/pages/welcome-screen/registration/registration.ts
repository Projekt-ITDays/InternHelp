import { CommonModule } from '@angular/common';
import { Component, signal, output, input, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../service/auth.service';
import Swal from 'sweetalert2';
import { LoggingDto } from '../../../interfaces/loggingDto';

@Component({
  selector: 'app-registration',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './registration.html',
  styleUrl: './registration.css',
})
export class Registration {
  authService = inject(AuthService);
  initialEmail = input<string>('');
  email = '';
  confirmEmail = '';
  initialPassword = input<string>('');
  password = '';
  confirmPassword = '';
  termsAccepted = false;
  errorMessage = signal('');
  register(): void {
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
    const payload : LoggingDto = {
      username: this.email,
      password: this.password,
    }
    this.authService.register(payload).subscribe({
      next: () => {
        Swal.fire({ 
          icon: 'success',
          title: 'Rejestracja zakończona sukcesem!',
          text: 'Możesz teraz zalogować się na swoje konto.',
        }).then(() => {
          this.closeRegistration();
        });
      },
      error: (err) => {
        console.error('Błąd rejestracji:', err);
        this.errorMessage.set('Wystąpił błąd podczas rejestracji. Spróbuj ponownie.');
      }
    });
    this.closeRegistration();
  }
  close = output<void>();
  closeRegistration(): void {
    this.close.emit();
  }

  ngOnInit(): void {
    this.email = this.initialEmail();
    this.password = this.initialPassword();
  }
}