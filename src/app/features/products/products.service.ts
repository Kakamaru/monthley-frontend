import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Page, Product } from '../../core/models/product.model';

export interface ProductQuery {
  active: boolean;
  category?: number | null;
  q?: string | null;
  page: number;
  size: number;
}

@Injectable({ providedIn: 'root' })
export class ProductsService {
  private http = inject(HttpClient);
  private base = '/api/v1/products';

  list(query: ProductQuery): Observable<Page<Product>> {
    let params = new HttpParams()
      .set('active', String(query.active))
      .set('page', String(query.page))
      .set('size', String(query.size));

    if (query.category != null) params = params.set('category', String(query.category));
    if (query.q) params = params.set('q', query.q);

    return this.http.get<Page<Product>>(this.base, { params });
  }

  get(id: number): Observable<Product> {
    return this.http.get<Product>(`${this.base}/${id}`);
  }

  create(body: Partial<Product>): Observable<Product> {
    return this.http.post<Product>(this.base, body);
  }

  update(id: number, body: Partial<Product>): Observable<Product> {
    return this.http.put<Product>(`${this.base}/${id}`, body);
  }
}
