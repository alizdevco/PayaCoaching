// Supabase Auth "Send SMS" hook.
//
// Supabase Auth generates and stores the OTP itself, then POSTs it here as a
// signed standard webhook. This function only forwards the code to sms.ir.
// The OTP is never logged and never leaves the server side.

import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0";

const SMS_IR_VERIFY_URL = "https://api.sms.ir/v1/send/verify";

function toLocalIranianPhone(phone: string): string {
  const digits = String(phone).replace(/\D/g, "");

  if (digits.startsWith("98")) {
    return `0${digits.slice(2)}`;
  }
  if (digits.startsWith("0")) {
    return digits;
  }
  return `0${digits}`;
}

function jsonResponse(body: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const hookSecret = Deno.env.get("SEND_SMS_HOOK_SECRET");
  const apiKey = Deno.env.get("SMS_IR_API_KEY");
  const templateId = Deno.env.get("SMS_IR_TEMPLATE_ID");
  const otpParamName = Deno.env.get("SMS_IR_OTP_PARAM_NAME") ?? "Code";

  if (!hookSecret || !apiKey || !templateId) {
    console.error("send-sms is missing required secrets");
    return jsonResponse(
      { error: { message: "SMS provider is not configured" } },
      500,
    );
  }

  const payload = await request.text();
  const headers = Object.fromEntries(request.headers);

  let event: {
    user: { phone: string };
    sms: { otp: string };
  };

  try {
    const webhook = new Webhook(hookSecret.replace("v1,whsec_", ""));
    event = webhook.verify(payload, headers) as typeof event;
  } catch {
    console.error("send-sms rejected a request with an invalid signature");
    return jsonResponse(
      { error: { message: "Invalid webhook signature" } },
      401,
    );
  }

  const phone = event.user?.phone;
  const otp = event.sms?.otp;

  if (!phone || !otp) {
    return jsonResponse(
      { error: { message: "Missing phone or otp in payload" } },
      400,
    );
  }

  let smsResponse: Response;
  try {
    smsResponse = await fetch(SMS_IR_VERIFY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/plain",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({
        mobile: toLocalIranianPhone(phone),
        templateId: Number(templateId),
        parameters: [{ name: otpParamName, value: otp }],
      }),
    });
  } catch (error) {
    console.error("send-sms could not reach sms.ir:", (error as Error).message);
    return jsonResponse(
      { error: { message: "Could not reach the SMS provider" } },
      502,
    );
  }

  const result = await smsResponse.json().catch(() => null);

  if (!smsResponse.ok || result?.status !== 1) {
    console.error("sms.ir rejected the message:", {
      httpStatus: smsResponse.status,
      status: result?.status,
    });
    return jsonResponse({ error: { message: "Sending the SMS failed" } }, 502);
  }

  return jsonResponse({}, 200);
});
