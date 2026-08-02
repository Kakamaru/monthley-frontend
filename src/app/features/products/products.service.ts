import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Page, Product } from '../../core/models/product.model';

export interface ProductCategory { id: number; code: string; name: string; }

/** Akaun yang melanggan satu produk — skrin Produk, View Account. */
export interface Subscriber {
  accountId: number;
  accountNo: string;
  accountName: string;
  /** Kategori akaun (BLOCK 1, BLOK 2…) — bukan kategori produk. */
  categoryName?: string;
  quantity: number;
  startDate?: string;
  /** Akaun ditutup yang masih melanggan tetap dipaparkan, dengan penanda. */
  accountActive: boolean;
}

export interface SubscriberPage {
  /** Langganan dalam tempoh — end_date yang sudah lepas ditapis keluar. */
  total: number;
  /** Daripada total, berapa akaunnya ACTIVE. */
  aktif: number;
  page: number;
  size: number;
  items: Subscriber[];
}

export interface ProductQuery {
  active: boolean;
  category?: number | null;
  q?: string | null;
  page: number;
  size: number;
}

/** Satu baris dalam langganan pukal — kuantiti dan tarikh per akaun. */
export interface BulkLine {
  accountId: number;
  quantity: number | null;
  startDate: string | null;
  endDate: string | null;
}

export interface BulkSubscribeResult {
  ditambah: number;
  /** Akaun yang sudah melanggan — dilangkau, bukan menggagalkan kelompok. */
  dilangkau: number;
  sebab: string[];
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

  categories(): Observable<ProductCategory[]> {
    return this.http.get<ProductCategory[]>('/api/v1/product-categories');
  }

  create(body: Partial<Product>): Observable<Product> {
    return this.http.post<Product>(this.base, body);
  }

  update(id: number, body: Partial<Product>): Observable<Product> {
    return this.http.put<Product>(`${this.base}/${id}`, body);
  }

  /** Tukar status sahaja — bukan update penuh (medan lain tidak disentuh). */
  /**
   * Langgan satu produk untuk banyak akaun.
   *
   * Endpoint duduk di bawah /accounts: ia menulis account_subscription,
   * dan modul catalog tidak boleh menyentuhnya.
   */
  bulkSubscribe(productId: number, lines: BulkLine[]): Observable<BulkSubscribeResult> {
    return this.http.post<BulkSubscribeResult>(
      '/api/v1/accounts/bulk-subscribe', { productId, lines });
  }

  setStatus(id: number, active: boolean): Observable<Product> {
    return this.http.put<Product>(`${this.base}/${id}/status`, { active });
  }

  /**
   * Akaun yang melanggan produk ini.
   *
   * Endpoint duduk di bawah /accounts, bukan /products: "akaun mana
   * melanggan produk X" ialah soalan tentang akaun, dan modul catalog
   * tidak boleh menyoal langganan.
   */
  subscribers(productId: number, page: number, size: number): Observable<SubscriberPage> {
    const params = new HttpParams()
      .set('page', String(page))
      .set('size', String(size));
    return this.http.get<SubscriberPage>(
      `/api/v1/accounts/by-product/${productId}`, { params });
  }
}
