import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { SpContextService } from './sp-context.service';

/** Sisip header X-SP-Id ke setiap panggilan /api (handoff §5). */
export const spHeaderInterceptor: HttpInterceptorFn = (req, next) => {
  const sp = inject(SpContextService).currentSp();
  if (req.url.includes('/api/') && sp) {
    req = req.clone({ setHeaders: { 'X-SP-Id': sp } });
  }
  return next(req);
};
