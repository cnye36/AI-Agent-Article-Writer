"use client";

import { useState, useEffect } from "react";
import { X, Settings, CreditCard, User, Bell, Shield, Globe } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: "settings" | "billing";
}

export function SettingsModal({
  isOpen,
  onClose,
  initialTab = "settings",
}: SettingsModalProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"settings" | "billing">(
    initialTab
  );

  // Update active tab when initialTab changes
  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  // Handle Escape key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-zinc-800">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            Settings
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-slate-600 dark:text-zinc-400" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 dark:border-zinc-800">
          <button
            onClick={() => setActiveTab("settings")}
            className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 text-sm font-medium transition-colors ${
              activeTab === "settings"
                ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-blue-50/50 dark:bg-blue-900/10"
                : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-zinc-800"
            }`}
          >
            <Settings className="w-4 h-4" />
            Settings
          </button>
          <button
            onClick={() => setActiveTab("billing")}
            className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 text-sm font-medium transition-colors ${
              activeTab === "billing"
                ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-blue-50/50 dark:bg-blue-900/10"
                : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-zinc-800"
            }`}
          >
            <CreditCard className="w-4 h-4" />
            Billing
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === "settings" && <SettingsSection user={user} />}
          {activeTab === "billing" && <BillingSection user={user} />}
        </div>
      </div>
    </div>
  );
}

function SettingsSection({ user }: { user: any }) {
  const [email, setEmail] = useState(user?.email || "");
  const [name, setName] = useState("");
  const [notifications, setNotifications] = useState({
    email: true,
    push: false,
    marketing: false,
  });
  const [language, setLanguage] = useState("en");
  const [timezone, setTimezone] = useState("UTC");
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    // TODO: Implement save functionality
    setTimeout(() => {
      setIsSaving(false);
    }, 1000);
  };

  return (
    <div className="space-y-8">
      {/* Profile Section */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <User className="w-5 h-5 text-slate-600 dark:text-zinc-400" />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
            Profile
          </h3>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-zinc-300">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 bg-white dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900 dark:text-white"
              disabled
            />
            <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
              Email cannot be changed
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-zinc-300">
              Display Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your display name"
              className="w-full px-4 py-2 bg-white dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900 dark:text-white"
            />
          </div>
        </div>
      </section>

      {/* Notifications Section */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Bell className="w-5 h-5 text-slate-600 dark:text-zinc-400" />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
            Notifications
          </h3>
        </div>
        <div className="space-y-3">
          <label className="flex items-center justify-between p-3 bg-slate-50 dark:bg-zinc-800 rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-zinc-700 transition-colors">
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-white">
                Email Notifications
              </p>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                Receive email updates about your account
              </p>
            </div>
            <input
              type="checkbox"
              checked={notifications.email}
              onChange={(e) =>
                setNotifications({ ...notifications, email: e.target.checked })
              }
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
          </label>
          <label className="flex items-center justify-between p-3 bg-slate-50 dark:bg-zinc-800 rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-zinc-700 transition-colors">
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-white">
                Push Notifications
              </p>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                Receive push notifications in your browser
              </p>
            </div>
            <input
              type="checkbox"
              checked={notifications.push}
              onChange={(e) =>
                setNotifications({ ...notifications, push: e.target.checked })
              }
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
          </label>
          <label className="flex items-center justify-between p-3 bg-slate-50 dark:bg-zinc-800 rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-zinc-700 transition-colors">
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-white">
                Marketing Emails
              </p>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                Receive emails about new features and updates
              </p>
            </div>
            <input
              type="checkbox"
              checked={notifications.marketing}
              onChange={(e) =>
                setNotifications({
                  ...notifications,
                  marketing: e.target.checked,
                })
              }
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
          </label>
        </div>
      </section>

      {/* Preferences Section */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Globe className="w-5 h-5 text-slate-600 dark:text-zinc-400" />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
            Preferences
          </h3>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-zinc-300">
              Language
            </label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full px-4 py-2 bg-white dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900 dark:text-white"
            >
              <option value="en">English</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
              <option value="de">German</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-zinc-300">
              Timezone
            </label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full px-4 py-2 bg-white dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900 dark:text-white"
            >
              <option value="UTC">UTC</option>
              <option value="America/New_York">Eastern Time (ET)</option>
              <option value="America/Chicago">Central Time (CT)</option>
              <option value="America/Denver">Mountain Time (MT)</option>
              <option value="America/Los_Angeles">Pacific Time (PT)</option>
            </select>
          </div>
        </div>
      </section>

      {/* Security Section */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-5 h-5 text-slate-600 dark:text-zinc-400" />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
            Security
          </h3>
        </div>
        <div className="space-y-3">
          <button className="w-full px-4 py-2 text-left bg-slate-50 dark:bg-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-700 rounded-lg transition-colors">
            <p className="text-sm font-medium text-slate-900 dark:text-white">
              Change Password
            </p>
            <p className="text-xs text-slate-500 dark:text-zinc-400">
              Update your password to keep your account secure
            </p>
          </button>
          <button className="w-full px-4 py-2 text-left bg-slate-50 dark:bg-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-700 rounded-lg transition-colors">
            <p className="text-sm font-medium text-slate-900 dark:text-white">
              Two-Factor Authentication
            </p>
            <p className="text-xs text-slate-500 dark:text-zinc-400">
              Add an extra layer of security to your account
            </p>
          </button>
        </div>
      </section>

      {/* Save Button */}
      <div className="flex justify-end pt-4 border-t border-slate-200 dark:border-zinc-800">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
        >
          {isSaving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  );
}

function BillingSection({ user }: { user: any }) {
  const [paymentMethod, setPaymentMethod] = useState("card");
  const [billingAddress, setBillingAddress] = useState({
    street: "",
    city: "",
    state: "",
    zip: "",
    country: "US",
  });

  return (
    <div className="space-y-8">
      {/* Current Plan Section */}
      <section>
        <h3 className="text-lg font-semibold mb-4 text-slate-900 dark:text-white">
          Current Plan
        </h3>
        <div className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                Free Plan
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                Limited features • No credit card required
              </p>
            </div>
            <button className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors">
              Upgrade Plan
            </button>
          </div>
        </div>
      </section>

      {/* Payment Method Section */}
      <section>
        <h3 className="text-lg font-semibold mb-4 text-slate-900 dark:text-white">
          Payment Method
        </h3>
        <div className="space-y-4">
          <div className="p-4 bg-slate-50 dark:bg-zinc-800 rounded-lg border border-slate-200 dark:border-zinc-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CreditCard className="w-5 h-5 text-slate-600 dark:text-zinc-400" />
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                    No payment method on file
                  </p>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">
                    Add a payment method to upgrade your plan
                  </p>
                </div>
              </div>
              <button className="px-4 py-2 text-sm bg-white dark:bg-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-600 text-slate-900 dark:text-white rounded-lg border border-slate-200 dark:border-zinc-600 transition-colors">
                Add Payment Method
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Billing History Section */}
      <section>
        <h3 className="text-lg font-semibold mb-4 text-slate-900 dark:text-white">
          Billing History
        </h3>
        <div className="p-6 bg-slate-50 dark:bg-zinc-800 rounded-lg border border-slate-200 dark:border-zinc-700 text-center">
          <p className="text-sm text-slate-600 dark:text-zinc-400">
            No billing history available
          </p>
          <p className="text-xs text-slate-500 dark:text-zinc-500 mt-1">
            Your billing history will appear here once you upgrade
          </p>
        </div>
      </section>

      {/* Billing Address Section */}
      <section>
        <h3 className="text-lg font-semibold mb-4 text-slate-900 dark:text-white">
          Billing Address
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-zinc-300">
              Street Address
            </label>
            <input
              type="text"
              value={billingAddress.street}
              onChange={(e) =>
                setBillingAddress({
                  ...billingAddress,
                  street: e.target.value,
                })
              }
              placeholder="123 Main St"
              className="w-full px-4 py-2 bg-white dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900 dark:text-white"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-zinc-300">
                City
              </label>
              <input
                type="text"
                value={billingAddress.city}
                onChange={(e) =>
                  setBillingAddress({
                    ...billingAddress,
                    city: e.target.value,
                  })
                }
                placeholder="City"
                className="w-full px-4 py-2 bg-white dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-zinc-300">
                State
              </label>
              <input
                type="text"
                value={billingAddress.state}
                onChange={(e) =>
                  setBillingAddress({
                    ...billingAddress,
                    state: e.target.value,
                  })
                }
                placeholder="State"
                className="w-full px-4 py-2 bg-white dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900 dark:text-white"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-zinc-300">
                ZIP Code
              </label>
              <input
                type="text"
                value={billingAddress.zip}
                onChange={(e) =>
                  setBillingAddress({
                    ...billingAddress,
                    zip: e.target.value,
                  })
                }
                placeholder="12345"
                className="w-full px-4 py-2 bg-white dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-zinc-300">
                Country
              </label>
              <select
                value={billingAddress.country}
                onChange={(e) =>
                  setBillingAddress({
                    ...billingAddress,
                    country: e.target.value,
                  })
                }
                className="w-full px-4 py-2 bg-white dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900 dark:text-white"
              >
                <option value="US">United States</option>
                <option value="CA">Canada</option>
                <option value="GB">United Kingdom</option>
                <option value="AU">Australia</option>
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* Save Button */}
      <div className="flex justify-end pt-4 border-t border-slate-200 dark:border-zinc-800">
        <button className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors">
          Save Billing Information
        </button>
      </div>
    </div>
  );
}

