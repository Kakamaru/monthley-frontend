import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export interface ModuleRow {
  code: string; name: string; description: string | null; videoUrl: string | null;
  productId: number | null; productCode: string | null; price: number | null;
  businessTypes: string[]; sortOrder: number; active: boolean;
  subscriberCount: number;
}

export interface BusinessTypeOption { code: string; name: string; }
export interface ProductOption { id: number; code: string; name: string; price: number; }

@Injectable({ providedIn: 'root' })
export class ModuleCatalogService {
  private http = inject(HttpClient);
  private base = '/api/v1/platform/modules';

  list(): Observable<ModuleRow[]> {
    return this.http.get<ModuleRow[]>(this.base);
  }
  save(code: string, body: Partial<ModuleRow>): Observable<unknown> {
    return this.http.put(`${this.base}/${code}`, body);
  }
  businessTypes(): Observable<BusinessTypeOption[]> {
    return this.http.get<BusinessTypeOption[]>(`${this.base}/business-types`);
  }
  products(): Observable<ProductOption[]> {
    return this.http.get<ProductOption[]>(`${this.base}/products`);
  }
}
