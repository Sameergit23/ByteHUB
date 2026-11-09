export type PaymentStatusType =
  | "CREATED"
  | "PENDING"
  | "PAID"
  | "FAILED"
  | "REFUNDED"
  | "PARTIALLY_REFUNDED";

export const PaymentStatus: Record<PaymentStatusType, PaymentStatusType> = {
  CREATED: "CREATED",
  PENDING: "PENDING",
  PAID: "PAID",
  FAILED: "FAILED",
  REFUNDED: "REFUNDED",
  PARTIALLY_REFUNDED: "PARTIALLY_REFUNDED",
} as const;

const LEGAL_TRANSITIONS: Record<PaymentStatusType, Set<PaymentStatusType>> = {
  CREATED: new Set(["PENDING", "FAILED"]),
  PENDING: new Set(["PAID", "FAILED"]),
  PAID: new Set(["PARTIALLY_REFUNDED", "REFUNDED"]),
  PARTIALLY_REFUNDED: new Set(["PARTIALLY_REFUNDED", "REFUNDED"]),
  FAILED: new Set([]),
  REFUNDED: new Set([]),
};

export class IllegalPaymentTransitionError extends Error {
  public code = "ILLEGAL_STATE_TRANSITION";
  public statusCode = 409;
  public currentStatus: PaymentStatusType;
  public nextStatus: PaymentStatusType;

  constructor(currentStatus: PaymentStatusType, nextStatus: PaymentStatusType, orderId?: string) {
    super(
      `Illegal payment transition from '${currentStatus}' to '${nextStatus}'${
        orderId ? ` for order '${orderId}'` : ""
      }. Illegal state transitions are rejected.`
    );
    this.name = "IllegalPaymentTransitionError";
    this.currentStatus = currentStatus;
    this.nextStatus = nextStatus;
  }
}

export function validateStateTransition(
  fromStatus: PaymentStatusType,
  toStatus: PaymentStatusType,
  orderId?: string
): boolean {
  if (fromStatus === toStatus) {
    return true;
  }

  const allowedNext = LEGAL_TRANSITIONS[fromStatus];
  if (!allowedNext || !allowedNext.has(toStatus)) {
    throw new IllegalPaymentTransitionError(fromStatus, toStatus, orderId);
  }

  return true;
}

export function canRefund(status: PaymentStatusType): boolean {
  return status === "PAID" || status === "PARTIALLY_REFUNDED";
}
