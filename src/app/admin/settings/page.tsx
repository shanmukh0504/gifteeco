'use client';

import { useState } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { FaSave, FaStore, FaBell, FaShieldAlt } from 'react-icons/fa';
import { toast } from 'sonner';

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState({
    storeName: 'Gifteeco',
    storeEmail: 'admin@dappers.com',
    storePhone: '+1 234 567 8900',
    storeAddress: '123 Main Street, City, State 12345',
    notifications: true,
    lowStockAlert: true,
    orderNotifications: true,
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setSettings((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // In a real app, save to backend
    setTimeout(() => {
      toast.success('Settings saved successfully!');
      setLoading(false);
    }, 1000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-neutral-900 mb-2">Settings</h1>
        <p className="text-neutral-600">Manage your store settings and preferences</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Store Information */}
        <Card>
          <div className="flex items-center space-x-3 mb-6">
            <div className="bg-[#FF9AA2] p-3 rounded-lg">
              <FaStore className="text-white h-5 w-5" />
            </div>
            <h2 className="text-xl font-semibold text-neutral-900">Store Information</h2>
          </div>

          <div className="space-y-4">
            <Input
              label="Store Name"
              name="storeName"
              value={settings.storeName}
              onChange={handleChange}
            />
            <Input
              label="Store Email"
              type="email"
              name="storeEmail"
              value={settings.storeEmail}
              onChange={handleChange}
            />
            <Input
              label="Store Phone"
              type="tel"
              name="storePhone"
              value={settings.storePhone}
              onChange={handleChange}
            />
            <Input
              label="Store Address"
              name="storeAddress"
              value={settings.storeAddress}
              onChange={handleChange}
            />
          </div>
        </Card>

        {/* Notifications */}
        <Card>
          <div className="flex items-center space-x-3 mb-6">
            <div className="bg-[#FFB3BA] p-3 rounded-lg">
              <FaBell className="text-white h-5 w-5" />
            </div>
            <h2 className="text-xl font-semibold text-neutral-900">Notifications</h2>
          </div>

          <div className="space-y-4">
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                name="notifications"
                checked={settings.notifications}
                onChange={handleChange}
                className="w-5 h-5 text-[#FF9AA2] border-neutral-300 rounded focus:ring-[#FF9AA2]"
              />
              <span className="text-neutral-700">Enable notifications</span>
            </label>
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                name="lowStockAlert"
                checked={settings.lowStockAlert}
                onChange={handleChange}
                className="w-5 h-5 text-[#FF9AA2] border-neutral-300 rounded focus:ring-[#FF9AA2]"
              />
              <span className="text-neutral-700">Low stock alerts</span>
            </label>
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                name="orderNotifications"
                checked={settings.orderNotifications}
                onChange={handleChange}
                className="w-5 h-5 text-[#FF9AA2] border-neutral-300 rounded focus:ring-[#FF9AA2]"
              />
              <span className="text-neutral-700">New order notifications</span>
            </label>
          </div>
        </Card>

        {/* Security */}
        <Card>
          <div className="flex items-center space-x-3 mb-6">
            <div className="bg-[#FFD6D9] p-3 rounded-lg">
              <FaShieldAlt className="text-white h-5 w-5" />
            </div>
            <h2 className="text-xl font-semibold text-neutral-900">Security</h2>
          </div>

          <div className="space-y-4">
            <Input
              label="Current Password"
              type="password"
              placeholder="Enter current password"
            />
            <Input
              label="New Password"
              type="password"
              placeholder="Enter new password"
            />
            <Input
              label="Confirm New Password"
              type="password"
              placeholder="Confirm new password"
            />
          </div>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" isLoading={loading}>
            <FaSave className="mr-2" />
            Save Settings
          </Button>
        </div>
      </form>
    </div>
  );
}

