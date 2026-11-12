import { createContext } from "preact";
import { useContext } from "preact/hooks";
import type { RemoteLearner, SyncStatus } from "../account/sync";
import type { Store } from "../engine/storage";
import type { BillingInfo } from "../account/api";
import type { AssistantResponse, AssistantTurn } from "../assistant/types";

/** What the app needs from the account while it runs. */
export interface AccountBridge {
  persist(store: Store): void;
  forget(id: string): void;
  setHandlers(h: { remap(localId: string, remoteId: string): void; remote(r: RemoteLearner): void }): void;
}
export interface AccountInfoCtx {
  email?: string;
  /** The signed-in parent, used to keep the Parents' area PIN per account on this device. */
  userId: string;
  status: SyncStatus;
  notice: string;
  signOut(): Promise<void>;
  exportData(): Promise<unknown>;
  /** The weekly progress email: whether it is on, and a way to turn it on or off. */
  getWeeklyEmail(): Promise<boolean>;
  setWeeklyEmail(on: boolean): Promise<boolean>;
  deleteAccount(): Promise<void>;
  billing: BillingInfo;
  manageBilling(): Promise<void>;
  /** Downloads the curriculum booklet (PDF). */
  downloadBooklet(): Promise<void>;
  sendFeedback(f: { category: string; rating: number | null; message: string; mayReply: boolean; context: string }): Promise<void>;
  ask(message: string, history: AssistantTurn[], year: number | null): Promise<AssistantResponse>;
}
export const AccountCtx = createContext<AccountInfoCtx | null>(null);
/** The signed-in account, or null when the app is running without accounts. */
export const useAccount = () => useContext(AccountCtx);
