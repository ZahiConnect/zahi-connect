const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

export const formatCurrency = (value) => currencyFormatter.format(Number(value || 0));

export const formatDateTime = (value) => {
  if (!value) return "Not recorded";

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
};

export const formatOrderStatus = (status) =>
  String(status || "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

export const orderStatusClasses = {
  new: "bg-blue-50 text-blue-700 border-blue-200",
  preparing: "bg-amber-50 text-amber-700 border-amber-200",
  ready: "bg-indigo-50 text-indigo-700 border-indigo-200",
  out_for_service: "bg-violet-50 text-violet-700 border-violet-200",
  out_for_delivery: "bg-cyan-50 text-cyan-700 border-cyan-200",
  served: "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200",
  completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  cancelled: "bg-gray-100 text-gray-700 border-gray-200",
};

export const tableStatusClasses = {
  available: "bg-emerald-50 border-emerald-200 text-emerald-700",
  occupied: "bg-amber-50 border-amber-200 text-amber-700",
  reserved: "bg-blue-50 border-blue-200 text-blue-700",
};

export const getRelativeTime = (timestamp) => {
  if (!timestamp) return "Just now";

  const diffMinutes = Math.max(0, Math.round((Date.now() - new Date(timestamp).getTime()) / 60000));
  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes} min ago`;

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} hr ago`;

  const diffDays = Math.round(diffHours / 24);
  return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
};

export const formatOrderSourceLabel = (orderType) =>
  String(orderType || "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

export const getFoodTypeLabel = (foodType) =>
  foodType === "non_veg" ? "Non-Veg" : "Veg";

export const isDeliveryOrder = (order) => order?.order_type && order.order_type !== "dine_in";

const escapeHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

export const buildRestaurantBillHtml = (order) => {
  const itemsMarkup = (order?.items || [])
    .map(
      (item) => `
        <tr>
          <td>${escapeHtml(item.item_name)}</td>
          <td style="text-align:center;">${escapeHtml(item.quantity)}</td>
          <td style="text-align:right;">${escapeHtml(formatCurrency(item.unit_price))}</td>
          <td style="text-align:right;">${escapeHtml(formatCurrency(item.line_total))}</td>
        </tr>
      `
    )
    .join("");

  const guestLabel =
    order?.customer_name ||
    (order?.table_number ? `Table ${order.table_number}` : "Walk-in Guest");
  const serviceLabel = isDeliveryOrder(order)
    ? "Delivery / Pickup"
    : `Dine-In${order?.table_number ? ` - Table ${order.table_number}` : ""}`;

  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <title>${escapeHtml(order?.bill_number || `Order ${order?.id || ""}`)}</title>
        <style>
          body {
            font-family: "Segoe UI", Arial, sans-serif;
            margin: 0;
            background: #f6efe7;
            color: #24170f;
          }
          .sheet {
            max-width: 860px;
            margin: 32px auto;
            background: white;
            border-radius: 28px;
            padding: 40px;
            box-shadow: 0 18px 48px rgba(48, 28, 16, 0.12);
          }
          .header {
            display: flex;
            justify-content: space-between;
            gap: 24px;
            padding-bottom: 24px;
            border-bottom: 1px solid #eadfd1;
          }
          .eyebrow {
            letter-spacing: 0.24em;
            text-transform: uppercase;
            color: #a76541;
            font-size: 12px;
            font-weight: 700;
          }
          h1 {
            margin: 14px 0 0;
            font-size: 34px;
          }
          .bill-id {
            padding: 12px 18px;
            border-radius: 18px;
            background: #fbf6f0;
            font-size: 14px;
            font-weight: 700;
          }
          .meta-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 16px;
            margin: 28px 0;
          }
          .meta-card {
            border: 1px solid #efe4d7;
            border-radius: 20px;
            padding: 16px 18px;
            background: #fffdfa;
          }
          .meta-label {
            text-transform: uppercase;
            letter-spacing: 0.18em;
            font-size: 11px;
            color: #8c7a6a;
            margin-bottom: 10px;
          }
          .meta-value {
            font-size: 16px;
            font-weight: 700;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 16px;
          }
          th, td {
            padding: 14px 10px;
            border-bottom: 1px solid #f0e7de;
            font-size: 14px;
          }
          th {
            text-transform: uppercase;
            letter-spacing: 0.16em;
            font-size: 11px;
            color: #8c7a6a;
            text-align: left;
          }
          .total {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-top: 28px;
            padding: 22px 26px;
            border-radius: 24px;
            background: linear-gradient(135deg, #faf5ef 0%, #f1e3d2 100%);
          }
          .total-label {
            text-transform: uppercase;
            letter-spacing: 0.16em;
            font-size: 12px;
            color: #8c7a6a;
          }
          .total-value {
            font-size: 32px;
            font-weight: 800;
          }
          .footer-note {
            margin-top: 24px;
            padding: 16px 18px;
            border-radius: 18px;
            background: #fcf7f2;
            color: #5f5144;
            line-height: 1.6;
          }
          @media print {
            body {
              background: white;
            }
            .sheet {
              box-shadow: none;
              margin: 0;
              max-width: none;
              border-radius: 0;
            }
          }
        </style>
      </head>
      <body>
        <main class="sheet">
          <section class="header">
            <div>
              <div class="eyebrow">Restaurant Bill</div>
              <h1>Zahi Connect Dining Invoice</h1>
              <p style="margin: 12px 0 0; color: #655649; line-height: 1.6;">
                Bill for ${escapeHtml(guestLabel)}. This slip can be used by service staff,
                cashier, or the customer while settling payment.
              </p>
            </div>
            <div class="bill-id">${escapeHtml(order?.bill_number || "Bill Pending")}</div>
          </section>

          <section class="meta-grid">
            <div class="meta-card">
              <div class="meta-label">Guest / Table</div>
              <div class="meta-value">${escapeHtml(guestLabel)}</div>
            </div>
            <div class="meta-card">
              <div class="meta-label">Order Type</div>
              <div class="meta-value">${escapeHtml(serviceLabel)}</div>
            </div>
            <div class="meta-card">
              <div class="meta-label">Created</div>
              <div class="meta-value">${escapeHtml(formatDateTime(order?.created_at))}</div>
            </div>
            <div class="meta-card">
              <div class="meta-label">Status</div>
              <div class="meta-value">${escapeHtml(formatOrderStatus(order?.status))}</div>
            </div>
          </section>

          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th style="text-align:center;">Qty</th>
                <th style="text-align:right;">Rate</th>
                <th style="text-align:right;">Amount</th>
              </tr>
            </thead>
            <tbody>${itemsMarkup}</tbody>
          </table>

          <section class="total">
            <div>
              <div class="total-label">Total Payable</div>
              <div style="margin-top: 6px; color: #655649;">
                ${escapeHtml((order?.items || []).length)} menu line(s)
              </div>
            </div>
            <div class="total-value">${escapeHtml(formatCurrency(order?.total_amount))}</div>
          </section>

          <section class="footer-note">
            ${escapeHtml(order?.special_instructions || "Thank you for dining with us.")}
          </section>
        </main>
      </body>
    </html>
  `;
};

export const printRestaurantBill = (order) => {
  const printWindow = window.open("", "_blank", "width=960,height=720");
  if (!printWindow) return false;

  printWindow.document.open();
  printWindow.document.write(buildRestaurantBillHtml(order));
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
  return true;
};
