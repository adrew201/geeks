import { Badge } from "../../components/ui/Badge.tsx";
import { Button } from "../../components/ui/Button.tsx";
import { Modal } from "../../components/ui/Modal.tsx";
import { formatMoney } from "../../lib/format-money.ts";
import type { WalletEntry } from "../../types/api.ts";
import { dateTimeFormat, kindMeta } from "./wallet-model.ts";

// 08D state F "Transaction Details" modal, with the ledger's fields. Unlike 08D, Esc and
// the backdrop close it (components/ui/Modal).

export function TransactionModal({ entry, onClose }: { entry: WalletEntry | null; onClose: () => void }) {
  if (!entry) return null;
  const meta = kindMeta(entry.kind);
  const rows: Array<[string, React.ReactNode]> = [
    ["PayPal reference", <span className="font-mono">{entry.paypalRef}</span>],
    ["Type", <Badge tone={meta.tone} size="sm">{meta.label}</Badge>],
    ["Payment provider", "PayPal"],
    ["Date & time", dateTimeFormat.format(new Date(entry.createdAt))],
    ["Ledger entry", <span className="font-mono">{entry.id}</span>],
  ];
  return (
    <Modal
      open
      onClose={onClose}
      title="Transaction details"
      description={meta.description || undefined}
      footer={
        <Button variant="secondary" fullWidth onClick={onClose}>
          Close details
        </Button>
      }
    >
      <div className="rounded-md border border-border bg-inset p-4 text-center">
        <p className="text-11 font-bold tracking-[0.5px] text-fg-muted uppercase">Amount</p>
        <p className="font-display text-32 font-bold">
          {entry.amount > 0 ? "+" : ""}
          {formatMoney(entry.amount)}
        </p>
      </div>
      <dl className="flex flex-col divide-y divide-border">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-4 py-2.5">
            <dt className="text-12 text-fg-muted">{label}</dt>
            <dd className="text-right text-13 font-semibold break-all">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="text-11 text-fg-muted">
        Recorded in the Play2Pro ledger after PayPal's webhook was verified.
      </p>
    </Modal>
  );
}
