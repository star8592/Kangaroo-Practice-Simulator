import { type VerifiedPaymentReceipt } from "./billing-ledger";

/**
 * Pure trust-boundary adapter. This receives ONLY the already signature-
 * verified official WeChat Pay GET result from our internal transport.
 * Actual DB mutation is delegated to the existing atomic ledger settlement.
 */
export type PendingNativeOrder = Readonly<{
  id: string;
  amountMinor: number;
  currency: "CNY";
}>;

export type OfficialVerifiedQuery = Readonly<{
  status: "NOT_PAID" | "VERIFIED_PAID" | "VERIFIED_CLOSED";
  transactionId?: string;
  verifiedBodySha256?: string;
}>;

export type RecoveryDependencies = Readonly<{
  query: (order: PendingNativeOrder) => Promise<OfficialVerifiedQuery>;
  settle: (receipt: VerifiedPaymentReceipt) => Promise<unknown>;
  close?: (proof:{
    orderId:string;payloadSha256:string;verifiedAt:Date;
    signatureVerified:true;providerClosedConfirmed:true;
  }) => Promise<unknown>;
  now: () => Date;
}>;

export async function reconcileOneNativeOrder(
  order: PendingNativeOrder,
  deps: RecoveryDependencies,
): Promise<"NOT_PAID" | "SETTLED" | "CLOSED"> {
  if (!/^ord_[a-zA-Z0-9_-]{6,28}$/.test(order.id) ||
      !Number.isSafeInteger(order.amountMinor) ||
      order.amountMinor <= 0 || order.currency !== "CNY")
    throw new Error("INVALID_LOCAL_ORDER_SNAPSHOT");
  const verified = await deps.query(order);
  if (verified.status === "NOT_PAID") return "NOT_PAID";
  if (verified.status === "VERIFIED_CLOSED") {
    if(!/^[a-f0-9]{64}$/.test(verified.verifiedBodySha256??"") ||
       !deps.close)throw new Error("UNVERIFIED_PROVIDER_CLOSE");
    const at=deps.now();
    if(!Number.isFinite(at.getTime()))throw new Error("INVALID_VERIFIED_TIME");
    await deps.close({orderId:order.id,payloadSha256:verified.verifiedBodySha256!,
      verifiedAt:at,signatureVerified:true,providerClosedConfirmed:true});
    return "CLOSED";
  }
  if (verified.status !== "VERIFIED_PAID" ||
      !/^[A-Za-z0-9_-]{8,128}$/.test(verified.transactionId ?? "") ||
      !/^[0-9a-f]{64}$/.test(verified.verifiedBodySha256 ?? ""))
    throw new Error("UNVERIFIED_PROVIDER_RESULT");
  const now = deps.now();
  if (!Number.isFinite(now.getTime())) throw new Error("INVALID_VERIFIED_TIME");
  // Deterministic event ID: repeat official queries cannot create a new
  // payment; the DB lock and existing unique constraints complete the guard.
  await deps.settle({
    provider: "wechat_native",
    eventId: "native-query-" + verified.transactionId,
    orderId: order.id,
    transactionId: verified.transactionId!,
    amountMinor: order.amountMinor,
    currency: "CNY",
    payloadSha256: verified.verifiedBodySha256!,
    verifiedAt: now,
    signatureVerified: true,
    providerStatusConfirmed: true,
  });
  return "SETTLED";
}
