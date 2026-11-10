import crypto from "crypto";
import { env, isCashfreeMockMode } from "../config/env.js";
import { logger } from "../utils/logger.js";
import { AppError } from "../utils/apiError.js";

export interface CashfreeCustomerDetails {
  customerId: string;
  customerName?: string;
  customerEmail: string;
  customerPhone?: string;
}

export interface CreateCashfreeOrderParams {
  orderId: string;
  amount: number; // in INR rupees, e.g. 24999.00
  currency?: string;
  customer: CashfreeCustomerDetails;
  returnUrl?: string;
  notifyUrl?: string;
}

export interface CashfreeOrderResponse {
  cfOrderId?: string;
  orderId: string;
  paymentSessionId: string;
  orderStatus: string;
  orderAmount: number;
  orderCurrency: string;
}

/** Order as returned by Cashfree's "create order" API (fields we use). */
interface CashfreeCreateOrderApiResponse {
  cf_order_id?: string | number;
  order_id: string;
  payment_session_id: string;
  order_status: string;
  order_amount: number;
  order_currency: string;
  message?: string;
}

/** Order status as returned by Cashfree's "get order" API (fields we use). */
export interface CashfreeOrderStatus {
  order_id: string;
  order_status: string;
  cf_order_id?: string | number;
  order_amount?: number | string;
  order_currency?: string;
  /** Set only by the local test mode, never by Cashfree. */
  mock?: boolean;
}

export class CashfreeService {
  private static getBaseUrl(): string {
    const isProdKey =
      env.CASHFREE_SECRET_KEY.includes("_prod_") || env.CASHFREE_ENV === "PRODUCTION";
    return isProdKey ? "https://api.cashfree.com/pg" : "https://sandbox.cashfree.com/pg";
  }

  /**
   * Creates an active order on Cashfree PG v3 and obtains payment_session_id
   */
  static async createOrder(
    params: CreateCashfreeOrderParams
  ): Promise<CashfreeOrderResponse> {
    if (isCashfreeMockMode()) {
      logger.info(
        { orderId: params.orderId, amount: params.amount },
        "[CashfreeService] Using simulated test payment session (mock credentials detected)"
      );
      const mockSessionId = `session_cf_mock_${Date.now().toString(36)}_${crypto.randomBytes(6).toString("hex")}`;
      return {
        orderId: params.orderId,
        paymentSessionId: mockSessionId,
        orderStatus: "ACTIVE",
        orderAmount: params.amount,
        orderCurrency: params.currency || "INR",
      };
    }

    const url = `${this.getBaseUrl()}/orders`;
    const payload = {
      order_id: params.orderId,
      order_amount: params.amount,
      order_currency: params.currency || "INR",
      // Unpaid orders close shortly after the 15-minute seat hold lapses.
      order_expiry_time: new Date(Date.now() + 20 * 60 * 1000).toISOString(),
      customer_details: {
        customer_id: params.customer.customerId,
        customer_name: params.customer.customerName || "ByteHUB Student",
        customer_email: params.customer.customerEmail,
        customer_phone: params.customer.customerPhone || "9999999999",
      },
      order_meta: {
        return_url:
          params.returnUrl ||
          `${env.FRONTEND_URL}/training/checkout/return?order_id={order_id}`,
        notify_url: params.notifyUrl,
      },
    };

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "x-client-id": env.CASHFREE_APP_ID,
          "x-client-secret": env.CASHFREE_SECRET_KEY,
          "x-api-version": env.CASHFREE_API_VERSION,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as CashfreeCreateOrderApiResponse;

      if (!response.ok) {
        logger.error(
          { status: response.status, data },
          "[CashfreeService] Order creation error"
        );
        throw AppError.badRequest(
          data?.message || "Failed to create order on Cashfree payment gateway.",
          "CASHFREE_API_ERROR"
        );
      }

      return {
        cfOrderId: data.cf_order_id !== undefined ? String(data.cf_order_id) : undefined,
        orderId: data.order_id,
        paymentSessionId: data.payment_session_id,
        orderStatus: data.order_status,
        orderAmount: data.order_amount,
        orderCurrency: data.order_currency,
      };
    } catch (err) {
      if (err instanceof AppError) throw err;
      logger.error(
        { err },
        "[CashfreeService] Network or unexpected error calling Cashfree API"
      );
      throw AppError.internal(
        "Cashfree payment gateway service is temporarily unreachable.",
        "GATEWAY_UNAVAILABLE"
      );
    }
  }

  /**
   * Verifies Cashfree webhook signature using HMAC-SHA256 (timestamp + rawBody)
   */
  static verifyWebhookSignature(
    rawBody: Buffer | string,
    timestampHeader: string,
    signatureHeader: string
  ): boolean {
    if (!signatureHeader || !timestampHeader || !env.CASHFREE_SECRET_KEY) {
      return false;
    }

    try {
      const bodyString = Buffer.isBuffer(rawBody) ? rawBody.toString("utf8") : rawBody;
      const signaturePayload = `${timestampHeader}${bodyString}`;

      const expectedSignature = crypto
        .createHmac("sha256", env.CASHFREE_SECRET_KEY)
        .update(signaturePayload)
        .digest("base64");

      const headerBuffer = Buffer.from(signatureHeader, "utf8");
      const expectedBuffer = Buffer.from(expectedSignature, "utf8");

      if (headerBuffer.length !== expectedBuffer.length) {
        return false;
      }

      return crypto.timingSafeEqual(headerBuffer, expectedBuffer);
    } catch {
      return false;
    }
  }

  /**
   * Fetches order status from Cashfree REST API directly
   */
  static async getOrder(orderId: string): Promise<CashfreeOrderStatus> {
    if (isCashfreeMockMode()) {
      return {
        order_id: orderId,
        order_status: "PAID",
        mock: true,
      };
    }

    const url = `${this.getBaseUrl()}/orders/${orderId}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "x-client-id": env.CASHFREE_APP_ID,
        "x-client-secret": env.CASHFREE_SECRET_KEY,
        "x-api-version": env.CASHFREE_API_VERSION,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const errBody = (await response.json().catch(() => ({}))) as { message?: string };
      throw AppError.badRequest(
        errBody.message || "Failed to retrieve order from Cashfree."
      );
    }

    return (await response.json()) as CashfreeOrderStatus;
  }
}
