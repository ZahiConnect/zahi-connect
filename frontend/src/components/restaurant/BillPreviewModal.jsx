import { HiOutlinePrinter, HiOutlineX } from "react-icons/hi";

import {
  formatCurrency,
  formatDateTime,
  formatOrderSourceLabel,
  formatOrderStatus,
  printRestaurantBill,
} from "../../lib/restaurant";

export default function BillPreviewModal({ order, onClose }) {
  if (!order) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-[32px] bg-[#FFFDFC] shadow-[0_30px_80px_rgba(34,22,14,0.25)]">
        <div className="flex items-center justify-between border-b border-[#EADFD1] bg-[#FDF7F1] px-6 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#A76541]">
              Bill Preview
            </p>
            <h2 className="mt-2 text-2xl font-serif text-[#1F1A17]">
              {order.bill_number || `Order #${order.id.slice(0, 8)}`}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => printRestaurantBill(order)}
              className="inline-flex items-center gap-2 rounded-full bg-[#1A1A1A] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#33261f]"
            >
              <HiOutlinePrinter className="text-base" />
              Print Bill
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full bg-[#F0E6DB] p-2.5 text-[#6C5847] hover:bg-[#E7D9C9]"
            >
              <HiOutlineX className="text-lg" />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto px-6 py-6">
          <section className="rounded-[28px] border border-[#E8DDD0] bg-white p-6 shadow-sm">
            <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#A76541]">
                  Guest Details
                </p>
                <h3 className="mt-3 text-3xl font-serif text-[#22170F]">
                  {order.customer_name ||
                    (order.table_number ? `Table ${order.table_number}` : "Walk-in Guest")}
                </h3>
                <p className="mt-3 text-sm leading-7 text-[#655649]">
                  {formatOrderSourceLabel(order.order_type)}
                  {order.table_number ? ` | Table ${order.table_number}` : ""}
                  {order.customer_phone ? ` | ${order.customer_phone}` : ""}
                </p>
                {order.delivery_address && (
                  <div className="mt-4 rounded-2xl bg-[#FBF6F0] px-4 py-3 text-sm text-[#5F5144]">
                    {order.delivery_address}
                  </div>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                <InfoCard label="Order Status" value={formatOrderStatus(order.status)} />
                <InfoCard label="Created" value={formatDateTime(order.created_at)} />
                <InfoCard
                  label="Served"
                  value={order.served_at ? formatDateTime(order.served_at) : "Not served yet"}
                />
                <InfoCard
                  label="Payment"
                  value={
                    order.payment_method
                      ? `${formatOrderStatus(order.payment_method)}${order.payment_reference ? ` | ${order.payment_reference}` : ""}`
                      : "Pending settlement"
                  }
                />
              </div>
            </div>

            <div className="mt-8 overflow-hidden rounded-[24px] border border-[#EFE4D7]">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#FBF6F0] text-[#7A6B5E]">
                  <tr>
                    <th className="px-4 py-4 font-medium">Item</th>
                    <th className="px-4 py-4 font-medium">Qty</th>
                    <th className="px-4 py-4 font-medium">Rate</th>
                    <th className="px-4 py-4 text-right font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F2E7DA]">
                  {(order.items || []).map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-4">
                        <div className="font-medium text-[#1F1A17]">{item.item_name}</div>
                        {item.special_instructions && (
                          <div className="mt-1 text-xs text-amber-700">
                            Note: {item.special_instructions}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4 text-[#5F5144]">{item.quantity}</td>
                      <td className="px-4 py-4 text-[#5F5144]">{formatCurrency(item.unit_price)}</td>
                      <td className="px-4 py-4 text-right font-semibold text-[#1F1A17]">
                        {formatCurrency(item.line_total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {order.special_instructions && (
              <div className="mt-6 rounded-2xl bg-amber-50 px-4 py-4 text-sm text-amber-800">
                {order.special_instructions}
              </div>
            )}

            <div className="mt-6 flex flex-col gap-4 rounded-[28px] bg-[linear-gradient(135deg,#FAF5EF_0%,#F0E0CD_100%)] px-6 py-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8C7A6A]">
                  Total Payable
                </p>
                <p className="mt-2 text-sm text-[#655649]">
                  {order.items?.length || 0} menu line(s) in this bill
                </p>
              </div>
              <div className="text-4xl font-serif text-[#1F1A17]">
                {formatCurrency(order.total_amount)}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function InfoCard({ label, value }) {
  return (
    <div className="rounded-2xl border border-[#EEE2D5] bg-[#FFFCF8] px-4 py-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8C7A6A]">
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold text-[#1F1A17]">{value}</p>
    </div>
  );
}
