/**
 * ByteHUB Payment State Machine
 * States: CREATED, PENDING, PAID, FAILED, REFUNDED, PARTIALLY_REFUNDED
 * Enforces legal transitions and rejects illegal transitions (e.g. FAILED -> PAID or REFUNDED -> PAID).
 */

export const PaymentStatus = Object.freeze({
  CREATED: "CREATED",
  PENDING: "PENDING",
  PAID: "PAID",
  FAILED: "FAILED",
  REFUNDED: "REFUNDED",
  PARTIALLY_REFUNDED: "PARTIALLY_REFUNDED",
});

/**
 * Valid state transitions mapping:
 * currentStatus -> Set of allowed next states
 */
const LEGAL_TRANSITIONS = {
  [PaymentStatus.CREATED]: new Set([
    PaymentStatus.PENDING,
    PaymentStatus.FAILED,
  ]),
  [PaymentStatus.PENDING]: new Set([
    PaymentStatus.PAID,
    PaymentStatus.FAILED,
  ]),
  [PaymentStatus.PAID]: new Set([
    PaymentStatus.PARTIALLY_REFUNDED,
    PaymentStatus.REFUNDED,
  ]),
  [PaymentStatus.PARTIALLY_REFUNDED]: new Set([
    PaymentStatus.PARTIALLY_REFUNDED,
    PaymentStatus.REFUNDED,
  ]),
  [PaymentStatus.FAILED]: new Set([]), // Terminal state
  [PaymentStatus.REFUNDED]: new Set([]), // Terminal state
};

export class IllegalPaymentTransitionError extends Error {
  constructor(currentStatus, nextStatus, orderId) {
    super(
      `Illegal payment transition from '${currentStatus}' to '${nextStatus}'${
        orderId ? ` for order '${orderId}'` : ""
      }. Illegal state transitions are rejected.`
    );
    this.name = "IllegalPaymentTransitionError";
    this.code = "ILLEGAL_STATE_TRANSITION";
    this.statusCode = 409;
    this.currentStatus = currentStatus;
    this.nextStatus = nextStatus;
  }
}

/**
 * Validates whether transition from fromStatus to toStatus is legally permitted.
 * @throws {IllegalPaymentTransitionError} if transition is invalid
 */
export function validateStateTransition(fromStatus, toStatus, orderId) {
  // Idempotent self-transition is a no-op / accepted
  if (fromStatus === toStatus) {
    return true;
  }

  const allowedNext = LEGAL_TRANSITIONS[fromStatus];
  if (!allowedNext || !allowedNext.has(toStatus)) {
    throw new IllegalPaymentTransitionError(fromStatus, toStatus, orderId);
  }

  return true;
}

/**
 * Determines whether a given status allows further refunds
 */
export function canRefund(status) {
  return (
    status === PaymentStatus.PAID || status === PaymentStatus.PARTIALLY_REFUNDED
  );
}

