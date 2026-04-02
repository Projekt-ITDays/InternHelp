import { inject } from "@angular/core";
import { CanActivateFn, Router } from "@angular/router";
import { AuthService } from "../service/auth.service";


export const authGuard : CanActivateFn = (route, state) =>{
    const authService = inject(AuthService)
    const router = inject(Router)

    if (authService.isLoggedIn() === true){
        return true;
    }else{
        router.navigate(['/']);
        return false;
    }
}