"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CalendarClock, Mail, MapPin, Package, Phone, User } from "lucide-react";
import { getCustomer, type CustomerDetail } from "@/lib/api/admin-customers";
import { Skeleton } from "@/components/ui/Skeleton";
import { MapLink } from "@/components/ui/MapLink";
import { ShareAddressButton } from "@/components/ui/ShareAddressButton";
import { formatPriceFromPaise } from "@/lib/format/currency";

const ORDER_STATUS_STYLES: Record<string, string> = {
  CONFIRMED: "bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-400",
  PREPARING: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
  OUT_FOR_DELIVERY: "bg-secondary-50 text-secondary-700 dark:bg-secondary-950 dark:text-secondary-400",
  DELIVERED: "bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-400",
  CANCELLED: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400",
};

const SUB_STATUS_STYLES: Record<string, string> = {
  ACTIVE: "bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-400",
  EXPIRED: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-500",
  CANCELLED: "bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400",
};

export default function AdminCustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    getCustomer(id)
      .then(setCustomer)
      .catch(() => setNotFound(true));
  }, [id]);

  if (notFound) {
    return (
      <div className="flex flex-col items-center gap-4 py-24 text-center">
        <p className="text-zinc-600 dark:text-zinc-400">Customer not found.</p>
        <Link href="/admin/customers" className="btn-primary">
          Back to customers
        </Link>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="card p-6">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="mt-4 h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/admin/customers"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-600 hover:text-primary-600 dark:text-zinc-400"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to customers
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-100 text-primary-700 dark:bg-primary-950 dark:text-primary-400">
            <User className="h-6 w-6" />
          </div>
          <div>
            <h2 className="font-display text-lg font-bold text-zinc-900 dark:text-zinc-100">
              {customer.firstName} {customer.lastName ?? ""}
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Joined {new Date(customer.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
        <span
          className={`badge ${
            customer.isActive
              ? "bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-400"
              : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
          }`}
        >
          {customer.isActive ? "Active" : "Inactive"}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="card flex flex-col gap-3 p-6">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Contact</h3>
          <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
            <Mail className="h-4 w-4 shrink-0 text-primary-600" />
            <span>{customer.email}</span>
          </div>
          {customer.phone && (
            <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
              <Phone className="h-4 w-4 shrink-0 text-primary-600" />
              <span>{customer.phone}</span>
            </div>
          )}
          {customer.verifiedAt && (
            <p className="text-xs text-zinc-400">
              Verified {new Date(customer.verifiedAt).toLocaleDateString()}
            </p>
          )}
        </div>

        <div className="card flex flex-col gap-3 p-6 lg:col-span-2">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            <MapPin className="h-4 w-4" />
            Addresses
          </h3>
          {customer.addresses.length === 0 ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">No saved addresses.</p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {customer.addresses.map((address) => (
                <div
                  key={address.id}
                  className="rounded-lg border border-zinc-100 p-3 text-sm text-zinc-600 dark:border-zinc-800 dark:text-zinc-400"
                >
                  {address.label && (
                    <p className="mb-1 text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                      {address.label}
                      {address.isDefault && (
                        <span className="ml-1.5 badge bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-400">
                          Default
                        </span>
                      )}
                    </p>
                  )}
                  <p>
                    {address.line1}
                    {address.line2 ? `, ${address.line2}` : ""}, {address.city}, {address.state} —{" "}
                    {address.pincode}
                  </p>
                  <p className="mt-1 text-xs text-zinc-400">{address.contactPhone}</p>
                  <div className="mt-1.5 flex items-center gap-3 text-xs">
                    <MapLink lat={address.lat} lng={address.lng} />
                    <ShareAddressButton address={address} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="card flex flex-col gap-3 p-6">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          <Package className="h-4 w-4" />
          Recent orders
        </h3>
        {customer.orders.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">No orders yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {customer.orders.map((order) => (
              <Link
                key={order.id}
                href={`/admin/orders/${order.id}`}
                className="flex items-center justify-between gap-3 rounded-lg border border-zinc-100 px-3.5 py-2.5 text-sm hover:border-primary-200 dark:border-zinc-800 dark:hover:border-primary-800"
              >
                <div>
                  <p className="font-mono text-xs text-zinc-500 dark:text-zinc-400">{order.orderNumber}</p>
                  <p className="text-xs text-zinc-400">{new Date(order.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">
                    {formatPriceFromPaise(order.totalInPaise)}
                  </span>
                  <span className={`badge ${ORDER_STATUS_STYLES[order.status] ?? ""}`}>
                    {order.status.replace(/_/g, " ")}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="card flex flex-col gap-3 p-6">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          <CalendarClock className="h-4 w-4" />
          Subscriptions
        </h3>
        {customer.subscriptions.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">No subscriptions yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {customer.subscriptions.map((sub) => (
              <Link
                key={sub.id}
                href={`/admin/subscriptions/${sub.id}`}
                className="flex items-center justify-between gap-3 rounded-lg border border-zinc-100 px-3.5 py-2.5 text-sm hover:border-primary-200 dark:border-zinc-800 dark:hover:border-primary-800"
              >
                <div>
                  <p className="font-medium text-zinc-900 dark:text-zinc-100">{sub.planNameSnapshot}</p>
                  <p className="text-xs text-zinc-400">
                    {sub.startDate ? new Date(sub.startDate).toLocaleDateString() : "—"}
                    {" – "}
                    {sub.cycleEnd ? new Date(sub.cycleEnd).toLocaleDateString() : "—"}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">
                    {formatPriceFromPaise(sub.priceInPaiseSnapshot)}
                  </span>
                  <span className={`badge ${SUB_STATUS_STYLES[sub.status] ?? ""}`}>
                    {sub.status.replace("_", " ")}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
