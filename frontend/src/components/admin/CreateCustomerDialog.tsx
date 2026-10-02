"use client";

import { useId, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { MailCheck } from "lucide-react";
import { ApiError } from "@/lib/api/client";
import {
  addCustomerAddress,
  createCustomer,
  type Customer,
} from "@/lib/api/admin-customers";
import { qk } from "@/lib/query/keys";
import { useToast } from "@/context/ToastContext";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { SheetActions } from "@/components/ui/SheetActions";
import { PhoneInput } from "@/components/ui/PhoneInput";
import { AddressForm } from "@/components/addresses/AddressForm";

type Step = "details" | "address";

/**
 * Staff-side "Add customer" for phone-in orders: create the account (the
 * customer gets a set-password invite email), then optionally save their
 * first delivery address via the map picker. `onCreated` fires once the
 * flow is finished — with or without an address — so the caller can
 * select the new customer straight away.
 */
export function CreateCustomerDialog({
  open,
  onClose,
  onCreated,
  initialSearch = "",
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (customer: Customer) => void;
  /** Whatever the admin had typed into a customer search — prefilled into
   * email or name, whichever it looks like. */
  initialSearch?: string;
}) {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const formId = useId();
  const [step, setStep] = useState<Step>("details");
  const [created, setCreated] = useState<Customer | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [email, setEmail] = useState(() =>
    initialSearch.includes("@") ? initialSearch.trim() : "",
  );
  const [firstName, setFirstName] = useState(() =>
    initialSearch.includes("@") ? "" : initialSearch.trim(),
  );
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [sendInvite, setSendInvite] = useState(true);

  function finish(customer: Customer) {
    void queryClient.invalidateQueries({ queryKey: qk.admin("customers") });
    onCreated(customer);
    onClose();
  }

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const { customer } = await createCustomer({
        email: email.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim() || undefined,
        phone: phone || undefined,
        sendInvite,
      });
      showToast(
        sendInvite
          ? `Customer created — invite sent to ${customer.email}`
          : "Customer created",
        "success",
      );
      setCreated(customer);
      setStep("address");
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Couldn't create the customer.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <BottomSheet
      open={open}
      onClose={() => (created ? finish(created) : onClose())}
      title={step === "details" ? "Add customer" : "Add delivery address"}
    >
      {step === "details" ? (
        <form id={formId} onSubmit={handleCreate} className="flex flex-col gap-4">
          {error && (
            <p
              ref={(el) => el?.scrollIntoView({ block: "nearest" })}
              className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">
              {error}
            </p>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField
              id="cc-first-name"
              label="First name"
              required
              minLength={2}
              maxLength={50}
              value={firstName}
              onChange={setFirstName}
            />
            <TextField
              id="cc-last-name"
              label="Last name"
              maxLength={50}
              value={lastName}
              onChange={setLastName}
            />
          </div>
          <TextField
            id="cc-email"
            label="Email"
            type="email"
            required
            value={email}
            onChange={setEmail}
            hint="They'll use this to log in and track their orders."
          />
          <div className="flex flex-col gap-1">
            <label
              htmlFor="cc-phone"
              className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Mobile number
            </label>
            <PhoneInput id="cc-phone" value={phone} onChange={setPhone} />
          </div>
          <label className="flex cursor-pointer items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300">
            <input
              type="checkbox"
              checked={sendInvite}
              onChange={(e) => setSendInvite(e.target.checked)}
              className="mt-0.5 h-4 w-4 cursor-pointer accent-primary-600"
            />
            <span>
              Email them a link to set their password
              <span className="block text-xs text-zinc-500 dark:text-zinc-400">
                So they can log in, track orders and reorder. The link expires
                in 7 days — you can resend it from their profile.
              </span>
            </span>
          </label>
          <SheetActions>
            <button
              type="submit"
              form={formId}
              disabled={submitting}
              className="btn-primary cursor-pointer"
            >
              {submitting ? "Creating…" : "Create customer"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="btn-ghost cursor-pointer"
            >
              Cancel
            </button>
          </SheetActions>
        </form>
      ) : (
        created && (
          <div className="flex flex-col gap-4">
            <p className="flex items-center gap-2 rounded-lg bg-primary-50 px-3 py-2 text-sm text-primary-700 dark:bg-primary-950 dark:text-primary-400">
              <MailCheck className="h-4 w-4 shrink-0" />
              {created.firstName}&apos;s account is ready. Add where to deliver,
              or skip for now.
            </p>
            <AddressForm
              saveAddress={(input) =>
                addCustomerAddress(created.id, { ...input, isDefault: true })
              }
              defaultContactPhone={created.phone ?? undefined}
              allowOutOfArea
              onSaved={() => finish(created)}
              onCancel={() => finish(created)}
              cancelLabel="Skip for now"
            />
          </div>
        )
      )}
    </BottomSheet>
  );
}

function TextField({
  id,
  label,
  value,
  onChange,
  type = "text",
  required,
  minLength,
  maxLength,
  hint,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "email";
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label
        htmlFor={id}
        className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
      >
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        id={id}
        type={type}
        required={required}
        minLength={minLength}
        maxLength={maxLength}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input"
      />
      {hint && (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">{hint}</p>
      )}
    </div>
  );
}
