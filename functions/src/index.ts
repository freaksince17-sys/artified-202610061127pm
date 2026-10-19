/**
 * Artified_np - Firebase Cloud Functions
 * Automated Restock Email Notification System
 *
 * Listens for stock status updates on `products/{productId}` in Cloud Firestore.
 * When a piece is restocked (inStock changed from false -> true, or stockCount increased from 0 -> >0),
 * this Cloud Function automatically triggers personalized email notifications to all waitlisted customers.
 */

import { onDocumentUpdated, onDocumentDeleted } from "firebase-functions/v2/firestore";
import { onRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import * as nodemailer from "nodemailer";

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// Configure Nodemailer Email Transporter
// In production, uses SMTP credentials from process.env (e.g. SendGrid, Mailgun, or Google Workspace SMTP)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "465", 10),
  secure: process.env.SMTP_SECURE === "true" || true,
  auth: {
    user: process.env.SMTP_USER || "artified.np0@gmail.com",
    pass: process.env.SMTP_PASS || process.env.EMAIL_APP_PASSWORD || "",
  },
});

interface ProductDocument {
  id: string;
  title: string;
  subtitle?: string;
  price: number;
  originalPrice?: number;
  category: string;
  inStock: boolean;
  stockCount?: number;
  images: string[];
  description?: string;
}

interface WaitlistSubscriber {
  id: string;
  productId: string;
  productTitle: string;
  email: string;
  phone?: string;
  status: "pending" | "notified";
  notified: boolean;
  requestedAt: string;
}

/**
 * Builds a responsive luxury HTML email template tailored for Artified_np patrons
 */
function buildRestockEmailHtml(
  product: ProductDocument,
  subscriberEmail: string
): string {
  const productTitle = product.title || "Handcrafted Masterpiece";
  const priceNpr = `NPR ${product.price.toLocaleString()}.00`;
  const primaryImage =
    product.images && product.images[0]
      ? product.images[0]
      : "https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?auto=format&fit=crop&w=900&q=80";

  const shopUrl = process.env.SITE_URL || "https://artified-np.web.app";
  const productDirectUrl = `${shopUrl}#product-${product.id}`;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${productTitle} is Back in Stock - Artified_np</title>
</head>
<body style="margin: 0; padding: 0; background-color: #FAF8F5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1C1B1A;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #FAF8F5; padding: 32px 16px;">
    <tr>
      <td align="center">
        <!-- Main Email Container -->
        <table role="presentation" width="100%" style="max-width: 580px; background-color: #FFFFFF; border: 1px solid #E8DFD8; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.04);">
          
          <!-- Header Branding -->
          <tr>
            <td style="background-color: #1C1B1A; padding: 32px 24px; text-align: center; border-bottom: 2px solid #C5A880;">
              <h1 style="margin: 0; font-family: 'Playfair Display', Georgia, serif; font-size: 26px; color: #FAF8F5; font-weight: 700; letter-spacing: 2px;">
                ARTIFIED<span style="color: #D4AF37; font-size: 14px;">_np</span>
              </h1>
              <p style="margin: 6px 0 0; color: #C5A880; font-size: 12px; letter-spacing: 1px; text-transform: uppercase;">
                Handmade Luxury • Kathmandu, Nepal
              </p>
            </td>
          </tr>

          <!-- Notification Hero Intro -->
          <tr>
            <td style="padding: 32px 28px 20px; text-align: center;">
              <span style="display: inline-block; padding: 4px 14px; background-color: #FAF5EE; border: 1px solid #D4AF37; color: #8C5D36; border-radius: 20px; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px;">
                ✨ Back In Stock Alert
              </span>
              <h2 style="margin: 0 0 10px; font-family: 'Playfair Display', Georgia, serif; font-size: 22px; color: #1C1B1A; line-height: 1.3;">
                The Piece You Loved is Ready at Our Atelier
              </h2>
              <p style="margin: 0; font-size: 14px; color: #5E5955; line-height: 1.6;">
                Namaste! You asked us to notify you when <strong>${productTitle}</strong> returned to stock. Master artisan Sahina Shrestha and our workshop have freshly crafted a limited new batch.
              </p>
            </td>
          </tr>

          <!-- Product Showcase Card -->
          <tr>
            <td style="padding: 0 28px 24px;">
              <table role="presentation" width="100%" style="border: 1px solid #E8DFD8; border-radius: 16px; overflow: hidden; background-color: #FAF8F5;">
                <tr>
                  <td align="center" style="padding: 16px;">
                    <img src="${primaryImage}" alt="${productTitle}" style="width: 100%; max-width: 480px; height: auto; max-height: 320px; object-fit: cover; border-radius: 12px; display: block;" />
                  </td>
                </tr>
                <tr>
                  <td style="padding: 0 20px 20px; text-align: center;">
                    <h3 style="margin: 0 0 6px; font-size: 16px; font-weight: 600; color: #1C1B1A;">
                      ${productTitle}
                    </h3>
                    <p style="margin: 0 0 16px; font-size: 18px; font-weight: 700; color: #8C5D36;">
                      ${priceNpr}
                    </p>

                    <!-- Direct Quick Buy CTA -->
                    <a href="${productDirectUrl}" style="display: inline-block; padding: 14px 32px; background-color: #1C1B1A; color: #FAF8F5; text-decoration: none; border-radius: 12px; font-size: 13px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; box-shadow: 0 4px 12px rgba(28,27,26,0.2);">
                      ⚡ Quick Buy & Order Now
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Handcrafted Promise & Valley Delivery -->
          <tr>
            <td style="padding: 0 28px 28px;">
              <table role="presentation" width="100%" style="background-color: #F7F5F0; border-radius: 12px; padding: 16px;">
                <tr>
                  <td>
                    <p style="margin: 0 0 8px; font-size: 12px; font-weight: 600; color: #1C1B1A;">
                      🌿 Why Artified Pieces Are Unique:
                    </p>
                    <ul style="margin: 0; padding-left: 18px; font-size: 12px; color: #736C65; line-height: 1.6;">
                      <li>Handwoven pearl beads and macramé cords crafted in Kathmandu, Nepal</li>
                      <li>Fast delivery across Kathmandu Valley & 77 Nepal districts</li>
                      <li>Cash on Delivery (COD), eSewa, and Khalti accepted</li>
                    </ul>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Direct WhatsApp Assistance -->
          <tr>
            <td style="padding: 0 28px 28px; text-align: center;">
              <p style="margin: 0 0 10px; font-size: 13px; color: #736C65;">
                Need custom sizing or have questions about this piece?
              </p>
              <a href="https://wa.me/9779767573721?text=Hi%20Artified!%20I%20received%20the%20restock%20email%20for%20${encodeURIComponent(productTitle)}" style="display: inline-flex; align-items: center; gap: 8px; color: #075E54; font-size: 13px; font-weight: 600; text-decoration: none;">
                💬 Chat with our Founder & Creator on WhatsApp (+977 9767573721)
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #FAF8F5; padding: 24px; text-align: center; border-top: 1px solid #E8DFD8; font-size: 11px; color: #8C847E; line-height: 1.5;">
              <p style="margin: 0 0 6px;">
                © ${new Date().getFullYear()} Artified_np • Kathmandu, Nepal
              </p>
              <p style="margin: 0;">
                You received this notification because you subscribed to the waitlist with <strong>${subscriberEmail}</strong>.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

/**
 * Cloud Function: onProductStockUpdated
 * Triggers automatically whenever a product document in Firestore is updated.
 */
export const onProductStockUpdated = onDocumentUpdated(
  "products/{productId}",
  async (event) => {
    const beforeData = event.data?.before.data() as ProductDocument | undefined;
    const afterData = event.data?.after.data() as ProductDocument | undefined;
    const productId = event.params.productId;

    if (!beforeData || !afterData) {
      console.log(`[Waitlist Trigger] Incomplete snapshot data for ${productId}.`);
      return;
    }

    // Determine if product changed from out-of-stock to in-stock
    const wasOutOfStock =
      beforeData.inStock === false ||
      (typeof beforeData.stockCount === "number" && beforeData.stockCount <= 0);

    const isNowInStock =
      afterData.inStock === true &&
      (typeof afterData.stockCount !== "number" || afterData.stockCount > 0);

    // Only proceed if the piece transitioned to available stock
    if (!wasOutOfStock || !isNowInStock) {
      console.log(
        `[Waitlist Trigger] No restock transition detected for product ${productId}.`
      );
      return;
    }

    console.log(
      `[Waitlist Trigger] Restock detected for product "${afterData.title}" (ID: ${productId}). Querying waitlist subscribers...`
    );

    try {
      // Query pending subscribers for this product from waitlist_subscribers collection
      const subscribersSnapshot = await db
        .collection("waitlist_subscribers")
        .where("productId", "==", productId)
        .where("notified", "==", false)
        .get();

      if (subscribersSnapshot.empty) {
        console.log(`[Waitlist Trigger] No pending subscribers for product ${productId}.`);
        return;
      }

      console.log(
        `[Waitlist Trigger] Found ${subscribersSnapshot.size} pending subscriber(s) for "${afterData.title}". Dispatching emails...`
      );

      const emailPromises: Promise<any>[] = [];
      const batch = db.batch();
      const timestamp = new Date().toISOString();

      subscribersSnapshot.forEach((docSnap) => {
        const sub = docSnap.data() as WaitlistSubscriber;
        const subscriberEmail = sub.email;

        if (!subscriberEmail || !subscriberEmail.includes("@")) {
          return;
        }

        // 1. Prepare and send luxury HTML email
        const mailOptions = {
          from: `"Artified Nepal" <${process.env.SMTP_FROM || "artified.np0@gmail.com"}>`,
          to: subscriberEmail,
          subject: `✨ Back in Stock: ${afterData.title} is ready at Artified_np!`,
          html: buildRestockEmailHtml(afterData, subscriberEmail),
        };

        const sendPromise = transporter
          .sendMail(mailOptions)
          .then((info) => {
            console.log(
              `[Waitlist Trigger] Email successfully delivered to ${subscriberEmail} (Message ID: ${info.messageId})`
            );
          })
          .catch((mailErr) => {
            console.warn(
              `[Waitlist Trigger] Notice sending email to ${subscriberEmail}:`,
              mailErr.message
            );
          });

        emailPromises.push(sendPromise);

        // 2. Mark subscriber document as notified in Firestore
        const docRef = db.collection("waitlist_subscribers").doc(docSnap.id);
        batch.update(docRef, {
          status: "notified",
          notified: true,
          notifiedAt: timestamp,
          restockedStockCount: afterData.stockCount || 1,
        });
      });

      // Commit Firestore batch update & wait for email dispatch
      await Promise.all([batch.commit(), ...emailPromises]);

      console.log(
        `[Waitlist Trigger] Restock notification sequence completed successfully for ${productId}.`
      );
    } catch (err: any) {
      console.error(
        `[Waitlist Trigger] Error executing restock notifications for ${productId}:`,
        err
      );
    }
  }
);

/**
 * Helper to generate all possible Order ID variants (hyphenated, unhyphenated, and #-prefixed)
 * so that associated tracking records and status logs are matched regardless of formatting.
 */
function getOrderIdVariants(rawId: string): string[] {
  const clean = rawId.replace(/[#\s]/g, "").toUpperCase();
  const compact = clean.replace(/-/g, "");
  const variants = new Set<string>([rawId, clean, compact, `#${clean}`, `#${compact}`]);

  // Convert ART2026XXXX <-> ART-2026-XXXX
  const matchCompact = compact.match(/^([A-Z]+)(\d{4})(\d+)$/);
  if (matchCompact) {
    const hyphenated = `${matchCompact[1]}-${matchCompact[2]}-${matchCompact[3]}`;
    variants.add(hyphenated);
    variants.add(`#${hyphenated}`);
  }
  return Array.from(variants).filter(Boolean);
}

/**
 * Shared cascade cleanup helper that removes all tracking records, user sub-collection records,
 * and status logs associated with a deleted order ID.
 */
async function cascadeDeleteOrderRecords(rawOrderId: string): Promise<void> {
  const variants = getOrderIdVariants(rawOrderId);
  const batch = db.batch();

  // 1. Delete direct document references in `tracked_orders`, `orders`, and `order_status_logs`
  for (const variant of variants) {
    const docKey = variant.replace(/^#/, "");
    if (!docKey) continue;
    batch.delete(db.collection("tracked_orders").doc(docKey));
    batch.delete(db.collection("orders").doc(docKey));
    batch.delete(db.collection("order_status_logs").doc(docKey));
  }

  // 2. Query `tracked_orders` where orderId or docId matches any variant
  const trackedByOrderId = await db
    .collection("tracked_orders")
    .where("orderId", "in", variants.slice(0, 10))
    .get();
  trackedByOrderId.forEach((docSnap) => batch.delete(docSnap.ref));

  // 3. Query `order_status_logs` where orderId matches any variant
  const statusLogsSnap = await db
    .collection("order_status_logs")
    .where("orderId", "in", variants.slice(0, 10))
    .get();
  statusLogsSnap.forEach((docSnap) => batch.delete(docSnap.ref));

  // 4. Delete any nested status_logs subcollections under orders/{id}/status_logs or tracked_orders/{id}/status_logs
  for (const variant of variants) {
    const docKey = variant.replace(/^#/, "");
    if (!docKey) continue;

    const orderSubLogs = await db
      .collection("orders")
      .doc(docKey)
      .collection("status_logs")
      .get();
    orderSubLogs.forEach((d) => batch.delete(d.ref));

    const trackedSubLogs = await db
      .collection("tracked_orders")
      .doc(docKey)
      .collection("status_logs")
      .get();
    trackedSubLogs.forEach((d) => batch.delete(d.ref));
  }

  // 5. Query collectionGroup `tracked_orders` (covers `users/{sessionToken}/tracked_orders/{docId}`)
  try {
    const groupSnap = await db
      .collectionGroup("tracked_orders")
      .where("orderId", "in", variants.slice(0, 10))
      .get();
    groupSnap.forEach((docSnap) => batch.delete(docSnap.ref));
  } catch (err) {
    console.warn("[Order Delete Cascade] CollectionGroup lookup notice:", err);
  }

  // 6. Record deleted order IDs in `store_settings/deleted_orders` tombstone
  const deletedSettingsRef = db.collection("store_settings").doc("deleted_orders");
  batch.set(
    deletedSettingsRef,
    {
      deletedIds: admin.firestore.FieldValue.arrayUnion(...variants),
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );

  await batch.commit();
}

/**
 * Cloud Function: onOrderDeleted
 * Triggers automatically when an order document is deleted from the Firestore `orders/{orderId}` collection.
 * Automatically removes all associated tracking records in `tracked_orders`, user subcollections,
 * and status logs in `order_status_logs`, preventing the deleted order from appearing in Track Order.
 */
export const onOrderDeleted = onDocumentDeleted(
  "orders/{orderId}",
  async (event) => {
    const orderId = event.params.orderId;
    const deletedData = event.data?.data();
    const targetId = (deletedData?.orderId as string) || orderId;

    console.log(
      `[Order Delete Cascade] Order "${targetId}" deleted from orders collection. Removing associated tracking records and status logs...`
    );

    try {
      await cascadeDeleteOrderRecords(targetId);
      console.log(
        `[Order Delete Cascade] Completed cleanup of tracking records and status logs for order "${targetId}".`
      );
    } catch (err) {
      console.error(
        `[Order Delete Cascade] Failed to clean up tracking records for order "${targetId}":`,
        err
      );
    }
  }
);

/**
 * Cloud Function: onTrackedOrderDeleted
 * Triggers when a document is deleted directly from `tracked_orders/{orderId}` to keep `orders` and logs in sync.
 */
export const onTrackedOrderDeleted = onDocumentDeleted(
  "tracked_orders/{orderId}",
  async (event) => {
    const orderId = event.params.orderId;
    const deletedData = event.data?.data();
    const targetId = (deletedData?.orderId as string) || orderId;

    try {
      await cascadeDeleteOrderRecords(targetId);
    } catch (err) {
      console.error(
        `[TrackedOrder Delete Cascade] Error cleaning up records for "${targetId}":`,
        err
      );
    }
  }
);

/**
 * Cloud Function: checkCatalogPriceVersion
 * Lightweight HTTP endpoint to fetch current Firestore price versioning & price map,
 * allowing frontends to quickly verify if local product catalog is stale.
 */
export const checkCatalogPriceVersion = onRequest(
  { cors: true },
  async (req, res) => {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");
    res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");

    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    try {
      const snap = await db.collection("products").get();
      const prices: Record<string, number> = {};
      let maxUpdatedAt = "1970-01-01T00:00:00.000Z";
      let priceSum = 0;

      snap.forEach((docSnap) => {
        const data = docSnap.data();
        if (data && data.id) {
          if (typeof data.price === "number") {
            prices[data.id] = data.price;
            priceSum += data.price;
          }
          if (data.updatedAt && typeof data.updatedAt === "string" && data.updatedAt > maxUpdatedAt) {
            maxUpdatedAt = data.updatedAt;
          }
        }
      });

      const catalogVersion = `v-${snap.size}-${priceSum}-${new Date(maxUpdatedAt).getTime() || Date.now()}`;

      res.status(200).json({
        status: "success",
        catalogVersion,
        productCount: snap.size,
        lastUpdated: maxUpdatedAt,
        prices,
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      console.error("[checkCatalogPriceVersion] Error:", err);
      res.status(500).json({
        status: "error",
        message: err.message || "Failed to check price versioning",
      });
    }
  }
);

