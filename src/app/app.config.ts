import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter, withRouterConfig } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';

import { routes } from './app.routes';
import { spHeaderInterceptor } from './core/services/sp-header.interceptor';
import { authInterceptor } from './core/auth/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    // onSameUrlNavigation 'reload' diperlukan supaya menukar SP boleh
    // memuat semula skrin semasa. Tanpa ini, navigasi ke URL yang sama
    // diabaikan dan komponen kekal memaparkan data SP sebelumnya.
    provideRouter(routes, withRouterConfig({ onSameUrlNavigation: 'reload' })),
    provideHttpClient(withInterceptors([authInterceptor, spHeaderInterceptor]))
  ]
};
