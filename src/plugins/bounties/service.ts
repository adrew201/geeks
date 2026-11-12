import { prisma } from "../../lib/prisma.js";

// Migration plan O5: bounty list, detail, and submission reject. Create,
// submit, and confirm stay out: they need PayPal escrow, the verification job,
// and payouts owned by Rabasa, Obonyo (submit/confirm handlers), and Gicharu.
// Money stays Decimal (no migration); rewardAmount is served as a string and
// reward as integer cents, both of which the web's toBounty() already reads.

interface SubmissionRow {
  id: string;
  bountyId: string;
  gamerId: string;
  status: string;
  aiVerificationStatus: string;
  aiConfidenceScore: number | null;
  aiReviewNotes: string | null;
  creatorConfirmed: boolean;
  clip?: { videoUrl: string } | null;
  gamer?: { displayName: string; profile?: { gamerTag: string } | null } | null;
}

interface BountyRow {
  id: string;
  creatorId: string;
  bountyType: string;
  title: string;
  taskDescription: string;
  game: string;
  rewardAmount: { toString(): string };
  deadline: Date;
  status: string;
  communityId: string | null;
  submissions?: SubmissionRow[];
}

// BountySubmission has no note column, so note is null until one exists.
export function toApiSubmission(row: SubmissionRow) {
  return {
    id: row.id,
    gamerId: row.gamerId,
    gamerTag: row.gamer?.profile?.gamerTag ?? row.gamer?.displayName ?? undefined,
    clipUrl: row.clip?.videoUrl,
    note: null,
    confirmed: row.creatorConfirmed,
    status: row.status,
    aiVerificationStatus: row.aiVerificationStatus,
    aiConfidenceScore: row.aiConfidenceScore,
    aiReviewNotes: row.aiReviewNotes,
    creatorConfirmed: row.creatorConfirmed,
  };
}

export function toApiBounty(row: BountyRow, opts?: { submissions?: SubmissionRow[] }) {
  const rewardAmount = String(row.rewardAmount);
  return {
    id: row.id,
    creatorId: row.creatorId,
    status: row.status,
    deadline: row.deadline.toISOString(),
    type: row.bountyType,
    bountyType: row.bountyType,
    title: row.title,
    task: row.taskDescription,
    taskDescription: row.taskDescription,
    game: row.game,
    reward: Math.round(Number(rewardAmount) * 100),
    rewardAmount,
    communityId: row.communityId,
    ...(opts?.submissions ? { submissions: opts.submissions.map(toApiSubmission) } : {}),
  };
}

const submissionInclude = {
  clip: { select: { videoUrl: true } },
  gamer: { select: { displayName: true, profile: { select: { gamerTag: true } } } },
};

export function listBounties() {
  return prisma.bounty.findMany({
    where: { status: "OPEN_ESCROWED" },
    orderBy: { deadline: "asc" },
  });
}

// The creator sees every entry; another logged-in gamer sees only their own.
// Anonymous callers see all entries (public discovery page).
export async function getBounty(id: string, viewerId?: string | null) {
  const bounty = await prisma.bounty.findUnique({
    where: { id },
    include: { submissions: { include: submissionInclude } },
  });
  if (!bounty) {
    throw Object.assign(new Error("bounty not found"), { statusCode: 404 });
  }
  const submissions =
    viewerId && viewerId !== bounty.creatorId
      ? bounty.submissions.filter((s) => s.gamerId === viewerId)
      : bounty.submissions;
  return toApiBounty(bounty, { submissions });
}

export interface RejectInput {
  bountyId: string;
  submissionId: string;
  requesterId: string;
}

export async function rejectSubmission({ bountyId, submissionId, requesterId }: RejectInput) {
  const bounty = await prisma.bounty.findUnique({ where: { id: bountyId } });
  if (!bounty) {
    throw Object.assign(new Error("bounty not found"), { statusCode: 404 });
  }
  if (bounty.creatorId !== requesterId) {
    throw Object.assign(new Error("only the bounty creator can reject entries"), {
      statusCode: 403,
    });
  }
  const submission = await prisma.bountySubmission.findUnique({ where: { id: submissionId } });
  if (!submission || submission.bountyId !== bountyId) {
    throw Object.assign(new Error("submission not found"), { statusCode: 404 });
  }
  if (submission.status === "WINNER_APPROVED") {
    throw Object.assign(new Error("cannot reject the winning entry"), { statusCode: 409 });
  }
  const updated = await prisma.bountySubmission.update({
    where: { id: submissionId },
    data: { status: "DECLINED", reviewedAt: new Date() },
    include: { clip: { select: { videoUrl: true } }, gamer: { select: { displayName: true } } },
  });
  return toApiSubmission(updated);
}
