import { HttpInterceptorFn } from "@angular/common/http";
import { inject } from "@angular/core";
import { AuthService } from "../service/auth.service";



export const authInterceptor : HttpInterceptorFn = (req, next) => {
    const auth = inject(AuthService);
    const token = auth.getAccessToken();
    if(token && req.url.includes('localhost:3000')){
        const authReq = req.clone({
            setHeaders : {
                Authorization : `Bearer ${token}`
            }
        });
        return next(authReq);
    }
    return next(req);
}
    // const token = localStorage.getItem('accessToken');