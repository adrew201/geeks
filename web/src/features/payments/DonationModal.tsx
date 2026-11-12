import { useState } from "react";
import { HandHeart } from "lucide-react";
import { gamerProfilePath, donatePath } from "../../components/layout/nav-config.ts";
import { Avatar } from "../../components/ui/Avatar.tsx";
import { PAYMENT_PURPOSE, type Cents, type GamerProfile } from "../../types/api.ts";
import { createDonation } from "./api.ts";
import { AmountPicker } from "./AmountPicker.tsx";
import { DONATION_DEFAULT, DONATION_MAX, DONATION_MIN, DONATION_PRESETS } from "./donation-config.ts";
import { PaymentModal } from "./PaymentModal.tsx";

// Donation = PaymentModal + recipient card (13D .content-summary-card, gamer row only) +
// amount picker. README §15.1: POST /donations → approval URL → PayPal → /pay/return.

export interface DonationModalProps {
  /** Render only while open (`{open && <DonationModal …/>}`) so each visit starts fresh. */
  open: boolean;
  onClose: () => void;
  gamer: GamerProfile;
  onUnauthenticated: () => void;
}

export function DonationModal({ open, onClose, gamer, onUnauthenticated }: DonationModalProps) {
  const [amount, setAmount] = useState<Cents | null>(DONATION_DEFAULT);
  const name = gamer.gamerTags[0] ?? "this gamer";
  const details = [`Gamer ID: ${gamer.id}`, gamer.games[0], gamer.region].filter(Boolean).join(" • ");

  return (
    <PaymentModal
      open={open}
      onClose={onClose}
      icon={<HandHeart className="size-5 text-primary" aria-hidden="true" />}
      title={`Support ${name}`}
      description="Send a donation straight to their Gamer ID wallet."
      lines={amount === null ? null : [{ label: `Donation to ${name}`, amount }]}
      canSubmit={amount !== null}
      createOrder={(signal) => {
        if (amount === null) return Promise.reject(new Error("No amount chosen."));
        return createDonation({ gamerId: gamer.id, amount }, signal);
      }}
      checkout={{
        purpose: PAYMENT_PURPOSE.DONATION,
        recipientName: gamer.gamerTags[0],
        returnPath: gamerProfilePath(gamer.id),
        retryPath: donatePath(gamer.id),
      }}
      onUnauthenticated={onUnauthenticated}
      ineligibleMessage={`${name} can't receive donations yet. Donations open once they link a verified adult PayPal account.`}
    >
      <div className="flex items-center gap-3 rounded-lg bg-inset p-4">
        <Avatar name={name} shape="tile" size="md" />
        <div className="min-w-0">
          <p className="truncate text-14 font-bold">{name}</p>
          <p className="truncate text-11 text-fg-muted">{details}</p>
        </div>
      </div>
      <AmountPicker
        presets={DONATION_PRESETS}
        min={DONATION_MIN}
        max={DONATION_MAX}
        value={amount}
        onChange={setAmount}
        label="Choose an amount"
      />
    </PaymentModal>
  );
}
