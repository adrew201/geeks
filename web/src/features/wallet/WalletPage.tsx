import { useEffect, useMemo, useRef, useState } from "react";
import type { AgGridReact } from "ag-grid-react";
import { Download, Info, RefreshCw, Share2, ShieldAlert, Wallet } from "lucide-react";
import { PageContainer, PageHeader } from "../../components/layout/PageHeader.tsx";
import { ROUTES } from "../../components/layout/nav-config.ts";
import { StatGrid, StatTile, StatTileSkeleton } from "../../components/data/StatTile.tsx";
import { Badge } from "../../components/ui/Badge.tsx";
import { Button, ButtonLink } from "../../components/ui/Button.tsx";
import { Card } from "../../components/ui/Card.tsx";
import { EmptyState } from "../../components/ui/EmptyState.tsx";
import { Skeleton } from "../../components/ui/Skeleton.tsx";
import { StatusPanel } from "../../components/ui/StatusPanel.tsx";
import { cn } from "../../lib/cn.ts";
import { formatMoney } from "../../lib/format-money.ts";
import { DESKTOP_QUERY, useMediaQuery } from "../../lib/use-media-query.ts";
import type { GamerDashboard, WalletEntry } from "../../types/api.ts";
import { useOwnDashboard } from "../dashboard/use-own-dashboard.ts";
import { TransactionModal } from "./TransactionModal.tsx";
import { TransactionsGrid } from "./TransactionsGrid.tsx";
import { BalanceChart, SourcesChart } from "./WalletCharts.tsx";
import {
  WALLET_PERIODS,
  balanceSeries,
  earningsBySource,
  entriesInPeriod,
  periodStart,
  sumBalance,
  walletTotals,
  type WalletPeriod,
} from "./wallet-model.ts";
import { WithdrawModal } from "./WithdrawModal.tsx";

// /wallet: page 08 reworked per decision 3. The money model is the WalletEntry ledger
// (DONATION, BOUNTY, AD_SHARE, WITHDRAWAL, FEE, REVERSAL), read from the owner's
// GET /gamers/:id/dashboard (walletBalance + walletEntries). 08D states as real states:
//   A Normal → ready · B Loading → skeletons · C Empty → no entries · F Tx details → modal.
//   D/E Pending/Failed focus are gone: ledger rows only exist once PayPal's webhook is
//   verified, so there is no pending or failed row to show.
// The period pills filter the metrics (except balance), the charts and the table; 08D's pills
// had no handlers. Export = AG Grid CSV of the visible rows. Withdraw is gated by
// isVerifiedAdult (decision 3, README §18).

export default function WalletPage() {
  const { status, dashboard, error, reload, refreshing } = useOwnDashboard();
  const isDesktop = useMediaQuery(DESKTOP_QUERY);
  const [period, setPeriod] = useState<WalletPeriod>("all");
  const [openEntry, setOpenEntry] = useState<WalletEntry | null>(null);
  const [withdrawing, setWithdrawing] = useState(false);
  const gridRef = useRef<AgGridReact<WalletEntry>>(null);

  useEffect(() => {
    document.title = "Wallet · Play2Pro";
  }, []);

  const entries = useMemo(() => dashboard?.walletEntries ?? [], [dashboard]);
  const balance = dashboard ? (dashboard.walletBalance ?? sumBalance(entries)) : 0;
  // UNCONFIRMED: the owner's isVerifiedAdult is only known if the Gamer ID carries it. When it's
  // missing the button stays on and the API's 403 NOT_VERIFIED_ADULT is handled in the modal.
  const ineligible = dashboard?.profile.isVerifiedAdult === false;
  const hasEntries = entries.length > 0;

  function exportCsv() {
    gridRef.current?.api.exportDataAsCsv({ fileName: `play2pro-wallet-${period}.csv` });
  }

  return (
    <>
      <PageHeader
        title="Earnings & Wallet"
        description="Donations, bounty rewards and ad share, verified by PayPal."
        actions={
          status === "ready" && (
            <>
              {isDesktop && hasEntries && (
                <Button variant="secondary" onClick={exportCsv}>
                  <Download className="size-3.5" aria-hidden="true" />
                  Export CSV
                </Button>
              )}
              <Button
                variant="paypal"
                size={isDesktop ? "md" : "sm"}
                disabled={ineligible || balance <= 0}
                onClick={() => setWithdrawing(true)}
              >
                <Wallet className="size-3.5" aria-hidden="true" />
                Withdraw
              </Button>
            </>
          )
        }
      />
      <PageContainer>
        {status === "loading" && <WalletSkeleton />}
        {status === "error" && (
          <Card>
            <StatusPanel
              tone="danger"
              title="Couldn't load your wallet"
              description={error}
              actions={
                <Button variant="secondary" onClick={reload}>
                  <RefreshCw className="size-3.5" aria-hidden="true" />
                  Try again
                </Button>
              }
            />
          </Card>
        )}
        {status === "ready" && dashboard && (
          <>
            {ineligible && <IneligibleNotice />}
            {hasEntries ? (
              <WalletBody
                dashboard={dashboard}
                entries={entries}
                balance={balance}
                period={period}
                onPeriod={setPeriod}
                compact={!isDesktop}
                refreshing={refreshing}
                onOpen={setOpenEntry}
                gridRef={gridRef}
              />
            ) : (
              <EmptyState
                icon={<Wallet />}
                title="No earnings yet"
                description="Share your Gamer ID so fans can donate, or win a sponsor bounty. Verified payments land here."
                action={
                  <div className="flex flex-wrap justify-center gap-3">
                    <ButtonLink to={ROUTES.passport} variant="secondary">
                      <Share2 className="size-3.5" aria-hidden="true" />
                      Share Gamer ID
                    </ButtonLink>
                    <ButtonLink to={ROUTES.bounties}>Browse bounties</ButtonLink>
                  </div>
                }
              />
            )}
            <HowItWorks />
          </>
        )}
      </PageContainer>
      <TransactionModal entry={openEntry} onClose={() => setOpenEntry(null)} />
      <WithdrawModal open={withdrawing} balance={balance} onClose={() => setWithdrawing(false)} onDone={reload} />
    </>
  );
}

interface WalletBodyProps {
  dashboard: GamerDashboard;
  entries: WalletEntry[];
  balance: number;
  period: WalletPeriod;
  onPeriod: (period: WalletPeriod) => void;
  compact: boolean;
  refreshing: boolean;
  onOpen: (entry: WalletEntry) => void;
  gridRef: React.RefObject<AgGridReact<WalletEntry> | null>;
}

function WalletBody({ entries, balance, period, onPeriod, compact, refreshing, onOpen, gridRef }: WalletBodyProps) {
  const inPeriod = useMemo(() => entriesInPeriod(entries, period), [entries, period]);
  const totals = useMemo(() => walletTotals(inPeriod), [inPeriod]);
  const balancePoints = useMemo(() => balanceSeries(entries, periodStart(period)), [entries, period]);
  const sources = useMemo(() => earningsBySource(inPeriod), [inPeriod]);
  const periodLabel = WALLET_PERIODS.find((option) => option.value === period)?.label.toLowerCase() ?? "";

  return (
    <>
      <PeriodPills value={period} onChange={onPeriod} />
      <StatGrid>
        <StatTile
          label="Available balance"
          value={formatMoney(balance)}
          emphasis="success"
          hint={refreshing ? "Updating…" : "Ready to withdraw"}
          tag={
            <Badge tone="green" size="sm">
              Verified
            </Badge>
          }
        />
        <StatTile label="Earned" value={formatMoney(totals.earned)} hint={`Donations, bounties, ad share · ${periodLabel}`} />
        <StatTile label="Withdrawn" value={formatMoney(totals.withdrawn)} hint={`Net of reversals · ${periodLabel}`} />
        <StatTile label="Fees" value={formatMoney(totals.fees)} hint={`${totals.count} transactions · ${periodLabel}`} />
      </StatGrid>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <Card>
          <div>
            <h2 className="text-16 font-bold">Balance over time</h2>
            <p className="text-12 text-fg-muted">Your running wallet balance after each verified transaction.</p>
          </div>
          {balancePoints.length > 0 ? (
            <BalanceChart points={balancePoints} height={compact ? 200 : 240} />
          ) : (
            <p className="py-10 text-center text-13 text-fg-muted">No transactions in this period.</p>
          )}
        </Card>
        <Card>
          <div>
            <h2 className="text-16 font-bold">Where your earnings come from</h2>
            <p className="text-12 text-fg-muted">Earnings by source, {periodLabel}.</p>
          </div>
          {sources.length > 0 ? (
            <SourcesChart points={sources} height={Math.max(140, sources.length * 56 + 40)} />
          ) : (
            <p className="py-10 text-center text-13 text-fg-muted">No earnings in this period.</p>
          )}
        </Card>
      </div>

      <Card>
        <div>
          <h2 className="text-16 font-bold">Transactions</h2>
          <p className="text-12 text-fg-muted">Select a row to see its PayPal reference and details.</p>
        </div>
        <TransactionsGrid entries={inPeriod} compact={compact} onOpen={onOpen} gridRef={gridRef} />
      </Card>
    </>
  );
}

/** 08D period pills (segmented), now wired. */
function PeriodPills({ value, onChange }: { value: WalletPeriod; onChange: (period: WalletPeriod) => void }) {
  return (
    <div role="group" aria-label="Period" className="flex w-fit gap-1 rounded-md border border-border bg-inset p-1">
      {WALLET_PERIODS.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            "cursor-pointer rounded-sm px-3 py-1.5 text-12 font-semibold transition-all duration-200",
            value === option.value ? "bg-surface text-fg shadow-card" : "text-fg-muted hover:text-fg",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function IneligibleNotice() {
  return (
    <div role="note" className="flex items-start gap-3 rounded-lg border border-warning/35 bg-warning/14 p-4">
      <ShieldAlert className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
      <p className="text-13">
        <span className="font-bold">Withdrawals are locked.</span>{" "}
        <span className="text-fg-secondary">
          A verified adult PayPal account is required to withdraw. Your balance stays in your wallet until then.
        </span>
      </p>
    </div>
  );
}

/** 08D "Your Play2Pro Wallet" panel, rewritten for the ledger. */
function HowItWorks() {
  return (
    <Card variant="inset" elevated={false} className="flex-row items-start gap-3">
      <Info className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
      <div className="flex flex-col gap-1 text-12 text-fg-secondary">
        <p className="text-13 font-bold text-fg">Your Play2Pro wallet</p>
        <p>
          Every credit and debit is a ledger entry, written only after PayPal's webhook is verified. Your balance is the
          sum of those entries.
        </p>
        <p>Withdrawals go to your PayPal account. If a payout fails, the amount returns to your wallet as a reversal.</p>
      </div>
    </Card>
  );
}

function WalletSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Loading your wallet">
      <StatGrid>
        {[0, 1, 2, 3].map((index) => (
          <StatTileSkeleton key={index} />
        ))}
      </StatGrid>
      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <Card>
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-56 w-full" />
        </Card>
        <Card>
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-40 w-full" />
        </Card>
      </div>
      <Card>
        <Skeleton className="h-4 w-32" />
        {[0, 1, 2, 3].map((index) => (
          <Skeleton key={index} className="h-9 w-full" />
        ))}
      </Card>
    </div>
  );
}
