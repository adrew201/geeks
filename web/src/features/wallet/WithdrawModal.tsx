import { useState, type FormEvent } from "react";
import { ShieldAlert } from "lucide-react";
import { Button } from "../../components/ui/Button.tsx";
import { Field, Input } from "../../components/ui/Field.tsx";
import { Modal } from "../../components/ui/Modal.tsx";
import { StatusPanel } from "../../components/ui/StatusPanel.tsx";
import { useToast } from "../../components/ui/use-toast.ts";
import { ApiError } from "../../lib/api-client.ts";
import { formatMoney, parseMoneyToCents } from "../../lib/format-money.ts";
import { API_ERROR_CODE, type Cents } from "../../types/api.ts";
import { requestWithdrawal } from "./api.ts";
import { withdrawError } from "./wallet-model.ts";

// Withdraw (README §15.4): POST /wallet/withdraw { amount }, verified adult, amount ≤
// balance. The API writes a negative WITHDRAWAL entry and sends a PayPal payout; a failed
// payout comes back as a REVERSAL entry. No design exists (08D said withdrawals were
// unavailable), so this is composed from the 13D modal, Field and StatusPanel.

export interface WithdrawModalProps {
  open: boolean;
  balance: Cents;
  onClose: () => void;
  /** Called after the API accepts the request, to refetch the ledger. */
  onDone: () => void;
}

export function WithdrawModal({ open, balance, onClose, onDone }: WithdrawModalProps) {
  const toast = useToast();
  const [value, setValue] = useState("");
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [ineligible, setIneligible] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const amount = parseMoneyToCents(value);
  const error = withdrawError(amount, balance);

  function close() {
    if (submitting) return;
    setValue("");
    setTouched(false);
    setServerError(null);
    setIneligible(false);
    onClose();
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setTouched(true);
    if (error || amount === null) return;
    setSubmitting(true);
    setServerError(null);
    try {
      await requestWithdrawal({ amount });
      toast.show(`Withdrawal of ${formatMoney(amount)} requested. PayPal usually pays out within minutes.`, {
        tone: "success",
      });
      setValue("");
      setTouched(false);
      onDone();
      onClose();
    } catch (caught) {
      if (caught instanceof ApiError && caught.code === API_ERROR_CODE.NOT_VERIFIED_ADULT) setIneligible(true);
      else setServerError(caught instanceof Error ? caught.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  if (ineligible) {
    return (
      <Modal open={open} onClose={close} title="Withdraw to PayPal">
        <StatusPanel
          tone="warning"
          icon={<ShieldAlert />}
          title="Verified adult account needed"
          description="Withdrawals need a verified adult PayPal account linked to Play2Pro. Your balance stays safe in your wallet until then."
          actions={
            <Button variant="secondary" onClick={close}>
              Close
            </Button>
          }
        />
      </Modal>
    );
  }

  return (
    <Modal
      open={open}
      onClose={close}
      dismissible={!submitting}
      title="Withdraw to PayPal"
      description={`Available balance: ${formatMoney(balance)}`}
      footer={
        <>
          <Button type="submit" form="withdraw-form" variant="paypal" fullWidth loading={submitting}>
            Withdraw {amount !== null && !error ? formatMoney(amount) : ""}
          </Button>
          <Button variant="ghost" fullWidth onClick={close} disabled={submitting}>
            Cancel
          </Button>
        </>
      }
    >
      <form id="withdraw-form" onSubmit={submit} noValidate className="flex flex-col gap-4">
        <Field
          label="Amount (USD)"
          error={touched ? error : null}
          hint="Paid to the PayPal account linked to your Play2Pro login."
          labelAside={
            <button
              type="button"
              className="cursor-pointer text-12 font-semibold text-primary hover:underline"
              onClick={() => setValue((balance / 100).toFixed(2))}
            >
              Withdraw all
            </button>
          }
        >
          <Input
            inputMode="decimal"
            autoComplete="off"
            placeholder="25.00"
            value={value}
            leading={<span className="text-13 font-semibold">$</span>}
            onChange={(event) => setValue(event.target.value)}
            onBlur={() => setTouched(true)}
          />
        </Field>
        {serverError && (
          <p role="alert" className="rounded-md border border-danger/35 bg-danger/14 px-3 py-2 text-12 text-danger-soft">
            {serverError}
          </p>
        )}
        <p className="text-11 text-fg-muted">
          The amount leaves your balance now. If PayPal can't complete the payout, it comes back to your wallet as a
          reversal.
        </p>
      </form>
    </Modal>
  );
}
