import nodemailer from "nodemailer";
import { prisma } from "@/lib/prisma";
import { formatNaira } from "@/lib/utils";

export async function sendVendorRegistrationNotification({
  vendorName, storeName, email, businessPageUrl,
}: { vendorName: string; storeName: string; email: string; businessPageUrl: string }): Promise<void> {
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="background:#0a0a0a;color:#f7efe2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;margin:0;padding:0;">
  <div style="max-width:520px;margin:0 auto;padding:48px 16px;">
    <div style="text-align:center;margin-bottom:32px;">
      <div style="font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#c4f23a;margin-bottom:6px;">Teaketer Store</div>
      <div style="font-size:22px;font-weight:700;color:#f7efe2;">New store application</div>
    </div>
    <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:28px 24px;margin-bottom:16px;">
      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.06);color:rgba(247,239,226,0.5);font-size:12px;width:130px;">Name</td><td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.06);color:#f7efe2;font-size:14px;">${vendorName}</td></tr>
        <tr><td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.06);color:rgba(247,239,226,0.5);font-size:12px;">Store name</td><td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.06);color:#f7efe2;font-size:14px;">${storeName}</td></tr>
        <tr><td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.06);color:rgba(247,239,226,0.5);font-size:12px;">Email</td><td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.06);color:#f7efe2;font-size:14px;">${email}</td></tr>
        <tr><td style="padding:10px 0;color:rgba(247,239,226,0.5);font-size:12px;vertical-align:top;padding-top:14px;">Business page</td><td style="padding:10px 0;padding-top:14px;"><a href="${businessPageUrl}" style="color:#c4f23a;font-size:14px;word-break:break-all;">${businessPageUrl}</a></td></tr>
      </table>
    </div>
    <div style="text-align:center;">
      <a href="${process.env.NEXT_PUBLIC_APP_URL ?? ""}/superadmin"
        style="display:inline-block;background:#c4f23a;color:#0a0a0a;font-weight:700;font-size:14px;padding:13px 28px;border-radius:100px;text-decoration:none;">
        Review in superadmin →
      </a>
    </div>
    <div style="text-align:center;font-size:12px;color:rgba(247,239,226,0.3);margin-top:28px;">
      Approve or decline within 24 hours.
    </div>
  </div>
</body>
</html>`;

  try {
    const transport = createTransport();
    await transport.sendMail({
      from: `"Teaketer" <${process.env.SMTP_FROM ?? process.env.SMTP_USER}>`,
      to: "teaketer@gmail.com",
      subject: `New store application: ${storeName} by ${vendorName}`,
      html,
    });
  } catch (err) {
    console.error("[email] vendor registration notification failed:", err);
  }
}

function createTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT ?? "465"),
    secure: process.env.SMTP_PORT !== "587",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

interface OrderEmailData {
  id: string;
  reference: string;
  buyerName: string;
  buyerEmail: string;
  deliveryAddress: string;
  deliveryState: string;
  totalAmount: number;
  items: Array<{
    productName: string;
    variantLabel: string;
    priceKobo: number;
    quantity: number;
  }>;
  vendor: { storeName: string; logoUrl: string };
}

export async function sendOrderConfirmationEmail(order: OrderEmailData): Promise<void> {
  const itemsHtml = order.items
    .map(
      (item) => `
      <tr>
        <td style="padding:10px 16px;border-bottom:1px solid rgba(255,255,255,0.06);color:#f7efe2;">${item.productName}${item.variantLabel ? ` <span style="color:rgba(247,239,226,0.5)">(${item.variantLabel})</span>` : ""}</td>
        <td style="padding:10px 16px;border-bottom:1px solid rgba(255,255,255,0.06);text-align:center;color:rgba(247,239,226,0.6);">${item.quantity}</td>
        <td style="padding:10px 16px;border-bottom:1px solid rgba(255,255,255,0.06);text-align:right;color:#f7efe2;font-weight:600;">${formatNaira(item.priceKobo * item.quantity)}</td>
      </tr>`
    )
    .join("");

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="background:#0a0a0a;color:#f7efe2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;margin:0;padding:0;">
  <div style="max-width:580px;margin:0 auto;padding:40px 16px;">

    <div style="text-align:center;margin-bottom:32px;">
      ${order.vendor.logoUrl ? `<img src="${order.vendor.logoUrl}" alt="${order.vendor.storeName}" style="height:48px;width:48px;border-radius:12px;object-fit:cover;margin-bottom:12px;" />` : ""}
      <div style="font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#c4f23a;margin-bottom:6px;">Teaketer Store</div>
      <div style="font-size:22px;font-weight:700;color:#f7efe2;">${order.vendor.storeName}</div>
      <div style="font-size:13px;color:rgba(247,239,226,0.5);margin-top:2px;">Order Confirmation</div>
    </div>

    <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:20px 24px;margin-bottom:16px;">
      <div style="font-size:18px;font-weight:700;margin-bottom:4px;">Hi ${order.buyerName} 👋</div>
      <div style="font-size:14px;color:rgba(247,239,226,0.6);">Your order is confirmed. We'll have it with you soon!</div>
    </div>

    <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:20px 24px;margin-bottom:16px;">
      <div style="font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:rgba(247,239,226,0.4);margin-bottom:6px;">Order Reference</div>
      <div style="font-family:monospace;font-size:14px;color:#c4f23a;">${order.reference}</div>
    </div>

    <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:16px;overflow:hidden;margin-bottom:16px;">
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <thead>
          <tr style="background:rgba(255,255,255,0.04);">
            <th style="padding:10px 16px;text-align:left;font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:rgba(247,239,226,0.4);font-weight:600;">Item</th>
            <th style="padding:10px 16px;text-align:center;font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:rgba(247,239,226,0.4);font-weight:600;">Qty</th>
            <th style="padding:10px 16px;text-align:right;font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:rgba(247,239,226,0.4);font-weight:600;">Total</th>
          </tr>
        </thead>
        <tbody>${itemsHtml}</tbody>
        <tfoot>
          <tr style="border-top:1px solid rgba(255,255,255,0.08);">
            <td colspan="2" style="padding:14px 16px;font-weight:700;">Order Total</td>
            <td style="padding:14px 16px;text-align:right;font-weight:700;color:#c4f23a;">${formatNaira(order.totalAmount)}</td>
          </tr>
        </tfoot>
      </table>
    </div>

    <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:20px 24px;margin-bottom:16px;">
      <div style="font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:rgba(247,239,226,0.4);margin-bottom:8px;">Delivery To</div>
      <div style="font-weight:600;">${order.buyerName}</div>
      <div style="font-size:13px;color:rgba(247,239,226,0.6);margin-top:2px;">${order.deliveryAddress}, ${order.deliveryState}</div>
    </div>

    <div style="text-align:center;padding-top:24px;font-size:12px;color:rgba(247,239,226,0.35);">
      Powered by <strong style="color:#c4f23a;">Teaketer</strong>
    </div>
  </div>
</body>
</html>`;

  try {
    const transport = createTransport();
    await transport.sendMail({
      from: `"${order.vendor.storeName}" <${process.env.SMTP_FROM ?? process.env.SMTP_USER}>`,
      to: order.buyerEmail,
      subject: `Order Confirmed — ${order.reference}`,
      html,
    });
    await prisma.order.update({
      where: { id: order.id },
      data: { confirmationEmailedAt: new Date() },
    });
  } catch (err) {
    console.error("[email] order confirmation failed:", err);
  }
}

interface VendorOrderEmailData {
  reference: string;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
  deliveryAddress: string;
  deliveryState: string;
  totalAmount: number;
  items: Array<{ productName: string; variantLabel: string; priceKobo: number; quantity: number }>;
  vendorEmail: string;
  storeName: string;
  adminOrdersUrl: string;
}

export async function sendVendorOrderEmail(data: VendorOrderEmailData): Promise<void> {
  const itemsHtml = data.items
    .map(
      (item) => `
      <tr>
        <td style="padding:10px 16px;border-bottom:1px solid #EBEBEB;color:#1A1A1A;">${item.productName}${item.variantLabel ? ` <span style="color:#888">(${item.variantLabel})</span>` : ""}</td>
        <td style="padding:10px 16px;border-bottom:1px solid #EBEBEB;text-align:center;color:#555;">${item.quantity}</td>
        <td style="padding:10px 16px;border-bottom:1px solid #EBEBEB;text-align:right;font-weight:600;color:#1A1A1A;">${formatNaira(item.priceKobo * item.quantity)}</td>
      </tr>`
    )
    .join("");

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="background:#FAFAF8;color:#1A1A1A;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;margin:0;padding:0;">
  <div style="max-width:580px;margin:0 auto;padding:40px 16px;">

    <div style="text-align:center;margin-bottom:28px;">
      <div style="font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#2D6A00;margin-bottom:6px;">New Order</div>
      <div style="font-size:22px;font-weight:700;color:#1A1A1A;">${data.storeName}</div>
    </div>

    <div style="background:#F0FDD4;border:1px solid #C4F23A;border-radius:16px;padding:20px 24px;margin-bottom:16px;">
      <div style="font-size:16px;font-weight:700;margin-bottom:4px;">💸 You have a new paid order!</div>
      <div style="font-size:14px;color:#2D6A00;">A customer just completed payment. Here are the details.</div>
    </div>

    <div style="background:#fff;border:1px solid #EBEBEB;border-radius:16px;padding:20px 24px;margin-bottom:16px;">
      <div style="font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:#AAA;margin-bottom:8px;">Order Reference</div>
      <div style="font-family:monospace;font-size:14px;font-weight:700;color:#1A1A1A;">${data.reference}</div>
    </div>

    <div style="background:#fff;border:1px solid #EBEBEB;border-radius:16px;padding:20px 24px;margin-bottom:16px;">
      <div style="font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:#AAA;margin-bottom:8px;">Customer</div>
      <div style="font-weight:600;">${data.buyerName}</div>
      <div style="font-size:13px;color:#555;margin-top:2px;">${data.buyerEmail}</div>
      <div style="font-size:13px;color:#555;">${data.buyerPhone}</div>
    </div>

    <div style="background:#fff;border:1px solid #EBEBEB;border-radius:16px;padding:20px 24px;margin-bottom:16px;">
      <div style="font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:#AAA;margin-bottom:8px;">Deliver To</div>
      <div style="font-size:13px;color:#1A1A1A;">${data.deliveryAddress}, ${data.deliveryState}</div>
    </div>

    <div style="background:#fff;border:1px solid #EBEBEB;border-radius:16px;overflow:hidden;margin-bottom:16px;">
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <thead>
          <tr style="background:#FAFAF8;">
            <th style="padding:10px 16px;text-align:left;font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:#AAA;font-weight:600;">Item</th>
            <th style="padding:10px 16px;text-align:center;font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:#AAA;font-weight:600;">Qty</th>
            <th style="padding:10px 16px;text-align:right;font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:#AAA;font-weight:600;">Total</th>
          </tr>
        </thead>
        <tbody>${itemsHtml}</tbody>
        <tfoot>
          <tr style="border-top:1px solid #EBEBEB;">
            <td colspan="2" style="padding:14px 16px;font-weight:700;">Order Total</td>
            <td style="padding:14px 16px;text-align:right;font-weight:700;color:#2D6A00;">${formatNaira(data.totalAmount)}</td>
          </tr>
        </tfoot>
      </table>
    </div>

    <div style="text-align:center;margin-bottom:24px;">
      <a href="${data.adminOrdersUrl}"
        style="display:inline-block;background:#1A1A1A;color:#fff;font-weight:700;font-size:14px;padding:14px 32px;border-radius:8px;text-decoration:none;letter-spacing:0.04em;">
        View in dashboard →
      </a>
    </div>

    <div style="text-align:center;font-size:12px;color:#AAA;">
      Powered by <strong style="color:#1A1A1A;">Teaketer</strong>
    </div>
  </div>
</body>
</html>`;

  try {
    const transport = createTransport();
    await transport.sendMail({
      from: `"Teaketer" <${process.env.SMTP_FROM ?? process.env.SMTP_USER}>`,
      to: data.vendorEmail,
      subject: `New order ${data.reference} — ${formatNaira(data.totalAmount)}`,
      html,
    });
  } catch (err) {
    console.error("[email] vendor order notification failed:", err);
  }
}

export async function sendTrackingEmail({
  email, storeName, link,
}: { email: string; storeName: string; link: string }): Promise<void> {
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="background:#0a0a0a;color:#f7efe2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;margin:0;padding:0;">
  <div style="max-width:520px;margin:0 auto;padding:48px 16px;">
    <div style="text-align:center;margin-bottom:32px;">
      <div style="font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#c4f23a;margin-bottom:6px;">Teaketer Store</div>
      <div style="font-size:22px;font-weight:700;color:#f7efe2;">${storeName}</div>
    </div>

    <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:28px 24px;margin-bottom:16px;text-align:center;">
      <div style="font-size:32px;margin-bottom:16px;">📦</div>
      <div style="font-size:18px;font-weight:700;margin-bottom:8px;">Here are your orders</div>
      <div style="font-size:14px;color:rgba(247,239,226,0.55);margin-bottom:24px;">
        Click the button below to view all orders placed with this email address.<br>This link expires in 1 hour.
      </div>
      <a href="${link}"
        style="display:inline-block;background:#c4f23a;color:#0a0a0a;font-weight:700;font-size:15px;padding:14px 32px;border-radius:100px;text-decoration:none;">
        View my orders →
      </a>
    </div>

    <div style="text-align:center;font-size:12px;color:rgba(247,239,226,0.3);margin-top:24px;">
      If you didn't request this, you can safely ignore this email.<br>
      Powered by <strong style="color:#c4f23a;">Teaketer</strong>
    </div>
  </div>
</body>
</html>`;

  const transport = createTransport();
  await transport.sendMail({
    from: `"${storeName}" <${process.env.SMTP_FROM ?? process.env.SMTP_USER}>`,
    to: email,
    subject: `Your orders at ${storeName}`,
    html,
  });
  console.log(`[email] tracking email sent to ${email}`);
}
