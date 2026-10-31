/**
 * WeChat Native code_url is a payment instruction, not proof of payment.
 * The order in our checkout is explicitly time_expire-limited to 30 minutes;
 * the QR must be hidden *before* that order deadline even though WeChat may
 * allow a code_url to remain usable for up to 2 hours otherwise.
 */
export const NATIVE_ORDER_WINDOW_SECONDS=30*60;
export const QR_EXPIRY_SAFETY_SECONDS=5;

/** Send a bounded TTL, not an untrusted device-local absolute timestamp. */
export function checkoutQrTtlSeconds(
  orderExpiresAtSeconds:number,serverNowSeconds:number,
):number{
  if(!Number.isSafeInteger(orderExpiresAtSeconds)||
     !Number.isSafeInteger(serverNowSeconds))return 0;
  return Math.max(0,Math.min(NATIVE_ORDER_WINDOW_SECONDS,
    orderExpiresAtSeconds-serverNowSeconds-QR_EXPIRY_SAFETY_SECONDS));
}

/** Monotonic clock survives local wall-clock changes and tab visibility. */
export function remainingQrSeconds(
  deadlineMonotonicMs:number|null,nowMonotonicMs:number,
):number {
  if(deadlineMonotonicMs===null ||
     !Number.isFinite(deadlineMonotonicMs)||
     !Number.isFinite(nowMonotonicMs))return 0;
  return Math.max(0,Math.floor((deadlineMonotonicMs-nowMonotonicMs)/1000));
}

export function validServerQrTtl(value:unknown):value is number {
  return typeof value==="number"&&Number.isSafeInteger(value)&&
    value>0&&value<=NATIVE_ORDER_WINDOW_SECONDS-QR_EXPIRY_SAFETY_SECONDS;
}
