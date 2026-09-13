"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, UserX } from "lucide-react";
import {
  ApiError,
  addToWaitlist,
  cancelWaitlistEntry,
  listWaitlist,
  seatWaitlistEntry,
  type DiningTable,
  type WaitlistEntry,
} from "@/lib/api/dine-in";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select";
import { useToast } from "@/context/ToastContext";

/** The "table's full, guest is standing" queue — deliberately has no items
 * and no bill, just who's waiting and how many. Seating a party is the only
 * way a real order ever gets created from here. */
export function WaitlistPanel({
  kitchenZoneId,
  freeTables,
  onSeated,
}: {
  kitchenZoneId: string;
  freeTables: DiningTable[];
  onSeated: () => void;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [entries, setEntries] = useState<WaitlistEntry[] | null>(null);
  const [adding, setAdding] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [partySize, setPartySize] = useState(1);
  const [seatingId, setSeatingId] = useState<string | null>(null);
  const [seatTableId, setSeatTableId] = useState("");

  function refresh() {
    listWaitlist(kitchenZoneId).then(setEntries).catch(() => setEntries([]));
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kitchenZoneId]);

  async function handleAdd() {
    setAdding(true);
    try {
      await addToWaitlist({
        kitchenZoneId,
        guestName: guestName.trim() || undefined,
        guestPhone: guestPhone.trim() || undefined,
        partySize,
      });
      setGuestName("");
      setGuestPhone("");
      setPartySize(1);
      showToast("Added to waitlist", "success");
      refresh();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Couldn't add to the waitlist.", "error");
    } finally {
      setAdding(false);
    }
  }

  async function handleCancel(id: string) {
    try {
      await cancelWaitlistEntry(id);
      showToast("Removed from waitlist", "success");
      refresh();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Couldn't remove this entry.", "error");
    }
  }

  async function handleSeat(id: string) {
    if (!seatTableId) return;
    try {
      const order = await seatWaitlistEntry(id, { tableId: seatTableId });
      showToast("Guest seated", "success");
      setSeatingId(null);
      setSeatTableId("");
      onSeated();
      router.push(`/admin/orders/${order.id}`);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Couldn't seat this party.", "error");
    }
  }

  return (
    <div className="card flex flex-col gap-4 p-6">
      <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Waitlist</h3>

      <div className="flex flex-wrap items-center gap-2">
        <input
          value={guestName}
          onChange={(e) => setGuestName(e.target.value)}
          placeholder="Name (optional)"
          className="input w-36"
        />
        <input
          value={guestPhone}
          onChange={(e) => setGuestPhone(e.target.value)}
          placeholder="Phone (optional)"
          className="input w-36"
        />
        <input
          type="number"
          min={1}
          value={partySize}
          onChange={(e) => setPartySize(Math.max(1, Number(e.target.value) || 1))}
          className="input w-20 text-center"
          title="Party size"
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={adding}
          className="btn-primary btn-sm cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          Add
        </button>
      </div>

      {!entries ? (
        <p className="text-sm text-zinc-400">Loading…</p>
      ) : entries.length === 0 ? (
        <p className="text-sm text-zinc-400">No one is waiting right now.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-100 px-3 py-2 dark:border-zinc-800"
            >
              <div className="text-sm text-zinc-700 dark:text-zinc-300">
                <span className="font-medium">{entry.guestName?.trim() || "Walk-in"}</span>
                <span className="text-zinc-400"> · {entry.partySize} guest{entry.partySize > 1 ? "s" : ""}</span>
                {entry.guestPhone && <span className="text-zinc-400"> · {entry.guestPhone}</span>}
                <span className="ml-2 text-xs text-zinc-400">
                  waiting since {new Date(entry.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {seatingId === entry.id ? (
                  <>
                    <Select value={seatTableId} onValueChange={setSeatTableId}>
                      <SelectTrigger className="w-36">
                        <SelectValue placeholder="Pick a table" />
                      </SelectTrigger>
                      <SelectContent>
                        {freeTables.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <button
                      type="button"
                      onClick={() => handleSeat(entry.id)}
                      disabled={!seatTableId}
                      className="btn-primary btn-sm cursor-pointer"
                    >
                      Confirm
                    </button>
                    <button
                      type="button"
                      onClick={() => setSeatingId(null)}
                      className="btn-ghost btn-sm cursor-pointer"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setSeatingId(entry.id)}
                      disabled={freeTables.length === 0}
                      className="btn-primary btn-sm cursor-pointer"
                      title={freeTables.length === 0 ? "No free tables right now" : undefined}
                    >
                      Seat
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCancel(entry.id)}
                      className="rounded p-1.5 text-zinc-400 hover:text-red-600"
                      title="Left without being seated"
                    >
                      <UserX className="h-4 w-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
