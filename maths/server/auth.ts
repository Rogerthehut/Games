import { verifyToken, createClerkClient } from "@clerk/backend";

/** Who is calling. The account API only needs a stable id for the signed-in parent. */
export interface AuthProvider {
  /** The parent's id from a bearer token, or null if there is no valid signed-in session. */
  authenticate(token: string | null): Promise<{ userId: string } | null>;
  /** Delete the sign-in identity itself (used when a parent deletes their account). Optional. */
  deleteUser?(userId: string): Promise<void>;
}

/** Clerk. Needs CLERK_SECRET_KEY. The browser sends the session token it gets from Clerk as `Authorization: Bearer ...`. */
export class ClerkAuth implements AuthProvider {
  constructor(private secretKey: string, private authorizedParties?: string[]) {}
  async authenticate(token: string | null) {
    if (!token) return null;
    try {
      const payload = await verifyToken(token, { secretKey: this.secretKey, authorizedParties: this.authorizedParties?.length ? this.authorizedParties : undefined });
      return payload?.sub ? { userId: payload.sub } : null;
    } catch {
      return null; // expired, forged or for another app: all the same to us
    }
  }
  async deleteUser(userId: string) {
    await createClerkClient({ secretKey: this.secretKey }).users.deleteUser(userId);
  }
}

/** For tests and local development only. The token is the user id. Never enabled in production. */
export class FakeAuth implements AuthProvider {
  deleted: string[] = [];
  async authenticate(token: string | null) {
    return token && /^fake_[a-z0-9_]{1,40}$/i.test(token) ? { userId: token } : null;
  }
  async deleteUser(userId: string) { this.deleted.push(userId); }
}
