import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import type { Request, Response } from 'express';

/** Per-process backstop. Multi-instance deployments also need a shared edge limiter. */
export class AttemptWindow {
  private buckets = new Map<string, { count: number; expires: number }>();
  allow(key: string, limit: number, now = Date.now()): number {
    let bucket = this.buckets.get(key);
    if (!bucket || bucket.expires <= now) {
      if (this.buckets.size >= 10000) {
        for (const [k, b] of this.buckets) if (b.expires <= now) this.buckets.delete(k);
        if (this.buckets.size >= 10000 && !bucket) return 60;
      }
      bucket = {count: 0, expires: now + 60000};
      this.buckets.set(key, bucket);
    }
    bucket.count++;
    return bucket.count > limit ? Math.max(1, Math.ceil((bucket.expires - now) / 1000)) : 0;
  }
}
@Injectable()
export class AuthRateLimitGuard implements CanActivate {
  private readonly attempts = new AttemptWindow();
  canActivate(context: ExecutionContext): boolean {
    const http = context.switchToHttp(), req = http.getRequest<Request>(), res = http.getResponse<Response>();
    const wait = this.attempts.allow(`${req.ip}:${req.path}`, req.path.endsWith('/register') ? 30 : 60);
    if (wait) {
      res.setHeader('Retry-After', String(wait));
      throw new HttpException('Too many attempts. Try again shortly.', HttpStatus.TOO_MANY_REQUESTS);
    }
    return true;
  }
}
