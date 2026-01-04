"use client";

import { useState } from "react";
import { toast } from "sonner";
import Button from "@/components/ui/Button";
import useAuthStore from "@/store/useAuthStore";
import type { Address } from "./types";

interface AddressSectionProps {
  addresses: Address[];
  selectedAddress: Address | null;
  onSelectAddress: (address: Address) => void;
  onAddressAdded: () => void;
}

export default function AddressSection({
  addresses,
  selectedAddress,
  onSelectAddress,
  onAddressAdded,
}: AddressSectionProps) {
  const { token } = useAuthStore();
  const [showAddAddress, setShowAddAddress] = useState(false);
  const [newAddress, setNewAddress] = useState({
    name: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
  });

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) {
      return;
    }

    try {
      const response = await fetch("/api/addresses", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...newAddress,
          isDefault: addresses.length === 0,
        }),
      });

      if (response.ok) {
        onAddressAdded();
        setShowAddAddress(false);
        setNewAddress({
          name: "",
          phone: "",
          address: "",
          city: "",
          state: "",
          pincode: "",
        });
        toast.success("Address added successfully");
      } else {
        toast.error("Failed to add address");
      }
    } catch (error) {
      console.error("Error adding address:", error);
      toast.error("Failed to add address");
    }
  };

  return (
    <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6">
      <h2 className="text-base sm:text-lg font-semibold text-neutral-900 mb-3 sm:mb-4">
        Address
      </h2>

      {!showAddAddress && (
        <button
          onClick={() => setShowAddAddress(true)}
          className="w-full mb-4 text-[#0258D9] hover:text-[#0247B8] flex items-center justify-center gap-2 py-2 transition"
        >
          <span>Enter new address</span>
          <div className="w-6 h-6 flex items-center justify-center rounded bg-[#0258D9] text-white hover:bg-[#0247B8] transition">
            <svg
              width="14"
              height="14"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M8 3V13M3 8H13"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </button>
      )}

      {showAddAddress ? (
        <form onSubmit={handleAddAddress} className="space-y-4">
          <input
            type="text"
            placeholder="Name"
            value={newAddress.name}
            onChange={(e) =>
              setNewAddress({ ...newAddress, name: e.target.value })
            }
            className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF9AA2]"
            required
          />
          <input
            type="tel"
            placeholder="Phone"
            value={newAddress.phone}
            onChange={(e) =>
              setNewAddress({ ...newAddress, phone: e.target.value })
            }
            className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF9AA2]"
            required
          />
          <textarea
            placeholder="Address"
            value={newAddress.address}
            onChange={(e) =>
              setNewAddress({ ...newAddress, address: e.target.value })
            }
            className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF9AA2]"
            rows={3}
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="City"
              value={newAddress.city}
              onChange={(e) =>
                setNewAddress({ ...newAddress, city: e.target.value })
              }
              className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF9AA2]"
              required
            />
            <input
              type="text"
              placeholder="State"
              value={newAddress.state}
              onChange={(e) =>
                setNewAddress({ ...newAddress, state: e.target.value })
              }
              className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF9AA2]"
              required
            />
          </div>
          <input
            type="text"
            placeholder="Pincode"
            value={newAddress.pincode}
            onChange={(e) =>
              setNewAddress({ ...newAddress, pincode: e.target.value })
            }
            className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF9AA2]"
            required
          />
          <div className="flex gap-2">
            <Button type="submit" className="flex-1">
              Save
            </Button>
            <button
              type="button"
              onClick={() => {
                setShowAddAddress(false);
                setNewAddress({
                  name: "",
                  phone: "",
                  address: "",
                  city: "",
                  state: "",
                  pincode: "",
                });
              }}
              className="px-4 py-2 border border-neutral-300 rounded-lg hover:bg-neutral-100"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <>
          {addresses.length === 0 ? (
            <p className="text-sm text-neutral-500 text-center py-4">
              No addresses saved. Add one to continue.
            </p>
          ) : (
            <div className="space-y-3">
              {addresses.map((address, index) => (
                <div
                  key={index}
                  onClick={() => onSelectAddress(address)}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition ${
                    selectedAddress === address
                      ? "border-[var(--color-button)] bg-white"
                      : "border-neutral-200 bg-neutral-50 hover:border-neutral-300 opacity-50"
                  }`}
                >
                  <p className="text-sm text-neutral-700">
                    {address.address}, {address.city}, {address.state}{" "}
                    {address.pincode}
                  </p>
                  {address.isDefault && (
                    <span className="text-xs text-[var(--color-button)] mt-1 inline-block">
                      Default
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
