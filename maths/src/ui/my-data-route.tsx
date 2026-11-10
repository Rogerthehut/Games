import { useAccount } from "./account-context";
import { useApp } from "./context";
import { MyDataPage } from "./my-data";

export function MyDataRoute() {
  const account = useAccount();
  const { go } = useApp();
  if (!account) return null;
  return <MyDataPage load={() => account.exportData()} email={account.email} onBack={() => go({ name: "parent" })} />;
}
