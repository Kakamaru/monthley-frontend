import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export interface MemoRow {
  id: number; title: string; body: string; status: string;
  publishedAt: string | null; expiresOn: string | null;
  expired: boolean; audienceCount: number;
}

export interface MyMemo {
  id: number; spName: string; title: string; body: string;
  publishedAt: string | null; expiresOn: string | null; expired: boolean;
}

@Injectable({ providedIn: 'root' })
export class MemoService {
  private http = inject(HttpClient);
  private base = '/api/v1/memos';

  list(): Observable<MemoRow[]> {
    return this.http.get<MemoRow[]>(this.base);
  }
  save(body: unknown, id?: number): Observable<unknown> {
    return id ? this.http.put(`${this.base}/${id}`, body)
              : this.http.post(this.base, body);
  }
  publish(id: number): Observable<unknown> {
    return this.http.post(`${this.base}/${id}/publish`, {});
  }
  /** Tamatkan lebih awal — memo ke 'Memo Lama', bukan kembali ke draf. */
  endNow(id: number): Observable<unknown> {
    return this.http.post(`${this.base}/${id}/end`, {});
  }
  unpublish(id: number): Observable<unknown> {
    return this.http.post(`${this.base}/${id}/unpublish`, {});
  }
  remove(id: number): Observable<unknown> {
    return this.http.delete(`${this.base}/${id}`);
  }

  /** Sisi pelanggan — merentas SP. */
  mine(scope: 'ACTIVE' | 'PAST'): Observable<MyMemo[]> {
    return this.http.get<MyMemo[]>('/api/v1/my-memos',
      { params: new HttpParams().set('scope', scope) });
  }
}
