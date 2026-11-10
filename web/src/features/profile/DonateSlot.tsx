// ┌──────────────────────────────────────────────────────────────────────────┐
// │ SLOT: Donate button. Not built yet; next step (PayPal checkout, step 5).  │
// └──────────────────────────────────────────────────────────────────────────┘
// Sits where 12D's header "Unlock Exclusive Footage" button and 12M's full-width unlock
// button were (both removed, decision 3). Renders nothing until the donation flow exists.
//
// When building it:
// - README §14: POST /api/v1/donations { gamerId, amount } → { approvalUrl, orderId };
//   any signed-in user. Amount in integer cents; format with lib/format-money.ts.
// - README §18: receiving donations needs the gamer to be a verified adult. GamerProfile has
//   no such flag yet, so ask Rabasa how the page should know before showing the button.
// - Decision 2: the flow continues in the repurposed 13–16 checkout pages.
// - Owners never see it (ProfileScreen only renders the slot for other viewers).

export interface DonateSlotProps {
  gamerId: string;
  /** desktop = 12D header action row; mobile = 12M full-width button in the identity card. */
  layout: "desktop" | "mobile";
}

export function DonateSlot(props: DonateSlotProps): null {
  void props;
  return null;
}
