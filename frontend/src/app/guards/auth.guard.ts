import { inject } from "@angular/core";
import { CanActivateFn, Router } from "@angular/router";
import { AuthService } from "../service/auth.service";
import Swal from 'sweetalert2';


export const authGuard : CanActivateFn = (route, state) =>{
    const authService = inject(AuthService)
    const router = inject(Router)

    if (authService.isLoggedIn() === true){
        return true;
    } else {
        Swal.fire({
            icon: 'error',
            title: 'Brak dostępu',
            text: 'Musisz się zalogować, aby zobaczyć tę stronę.',
            background: '#1a1713',
            color: '#fff',
            confirmButtonColor: '#cf6329'
        });
        router.navigate(['/']);
        return false;
    }
}