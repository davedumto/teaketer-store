"use client";

import { useState } from "react";
import { formatNaira } from "@/lib/utils";
import OrderActionButtons from "./OrderActionButtons";
import OrderDetailDrawer, { type OrderDetail } from "./OrderDetailDrawer";

const STATUS_CHIP: Record<string, { bg: string; color: string }> = {
  pending:   { bg: "#FEF9EC", color: "#D97706" },
  paid:      { bg: "#EFF6FF", color: "#2563EB" },
  fulfilled: { bg: "#F0FDD4", color: "#2D6A00" },
  cancelled: { bg: "#FEF2F2", color: "#DC2626" },
  refunded:  { bg: "#F3F4F6", color: "#6B7280" },
  refunding: { bg: "#FEF9EC", color: "#D97706" },
};

export default function OrdersTable({ orders }: { orders: OrderDetail[] }) {
  const [selected, setSelected] = useState<OrderDetail | null>(null);

  return (
    <>
      <tbody>
        {orders.length === 0 && (
          <tr>
            <td colSpan={8} className="px-5 py-10 text-center text-sm" style={{ color: "#888" }}>
              No orders found.
            </td>
          </tr>
        )}
        {orders.map((order) => {
          const chip = STATUS_CHIP[order.status] ?? { bg: "#F5F5F3", color: "#888" };
          return (
            <tr
              key={order.id}
              style={{ borderBottom: "1px solid #EBEBEB", cursor: "pointer" }}
              className="order-row"
              onClick={() => setSelected(order)}
            >
              <td className="px-4 py-3.5 font-mono text-xs" style={{ color: "#1A1A1A" }}>
                {order.reference.slice(0, 16)}…
              </td>
              <td className="px-4 py-3.5">
                <div className="font-semibold" style={{ color: "#1A1A1A" }}>{order.buyerName}</div>
                <div className="text-xs mt-0.5" style={{ color: "#888" }}>{order.buyerEmail}</div>
                <div className="text-xs" style={{ color: "#999" }}>{order.buyerPhone}</div>
              </td>
              <td className="px-4 py-3.5">
                <div style={{ color: "#1A1A1A", fontSize: 13 }}>
                  {order.items.map((item) => (
                    <div key={item.id}>
                      {item.productName}{item.variantLabel ? ` (${item.variantLabel})` : ""} × {item.quantity}
                    </div>
                  ))}
                </div>
                <div className="text-xs mt-1" style={{ color: "#888" }}>
                  {order.deliveryState} · {order.deliveryAddress.slice(0, 40)}{order.deliveryAddress.length > 40 ? "…" : ""}
                </div>
              </td>
              <td className="px-4 py-3.5 font-display text-sm" style={{ color: "#1A1A1A" }}>
                {formatNaira(order.totalAmount)}
              </td>
              <td className="px-4 py-3.5">
                {order.affiliate
                  ? <span className="text-xs font-mono" style={{ color: "#555" }}>{order.affiliate.code}</span>
                  : <span style={{ color: "#ccc" }}>—</span>
                }
              </td>
              <td className="px-4 py-3.5">
                <span className="text-xs px-2.5 py-1 rounded-full font-semibold" style={chip}>
                  {order.status}
                </span>
              </td>
              <td className="px-4 py-3.5 text-xs" style={{ color: "#888" }}>
                {new Date(order.createdAt).toLocaleDateString("en-NG")}
              </td>
              <td
                className="px-4 py-3.5"
                onClick={(e) => e.stopPropagation()}
              >
                <OrderActionButtons orderId={order.id} status={order.status} />
              </td>
            </tr>
          );
        })}
      </tbody>

      {selected && (
        <OrderDetailDrawer order={selected} onClose={() => setSelected(null)} />
      )}
    </>
  );
}
