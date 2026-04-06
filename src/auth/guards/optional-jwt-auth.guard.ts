import {
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Allows the request through with or without a valid Bearer JWT.
 * Sets `req.user` when valid; otherwise `req.user` is undefined.
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{ headers?: { authorization?: string }; user?: unknown }>();
    const auth = request.headers?.authorization;
    if (!auth?.startsWith('Bearer ')) {
      request.user = undefined;
      return true;
    }
    try {
      return (await super.canActivate(context)) as boolean;
    } catch {
      request.user = undefined;
      return true;
    }
  }

  handleRequest<TUser = unknown>(err: Error | undefined, user: TUser): TUser | undefined {
    if (err || !user) {
      return undefined;
    }
    return user;
  }
}
