import React, { useState, useEffect } from "react";
import {
  Save,
  ShieldAlert,
  CreditCard,
  Calendar,
  Layers,
  Plus,
  X,
  Loader2,
} from "lucide-react";
import { useSystemConfig, useUpdateSystemConfig, SystemConfig, DEFAULT_CONFIG } from "@/lib/queries/adminUsers";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export const AdminSettingsPage: React.FC = () => {
  const { data: config, isLoading } = useSystemConfig();
  const updateConfigMutation = useUpdateSystemConfig();

  const [formState, setFormState] = useState<SystemConfig>(DEFAULT_CONFIG);
  const [newDomainInput, setNewDomainInput] = useState("");
  const [newCategoryInput, setNewCategoryInput] = useState("");

  useEffect(() => {
    if (config) {
      setFormState(config);
    }
  }, [config]);

  const handleAddDomain = () => {
    const d = newDomainInput.trim().toLowerCase().replace(/^@/, "");
    if (!d) return;
    if (formState.allowedEmailDomains.includes(d)) {
      toast.error("Domain already present");
      return;
    }
    setFormState((prev) => ({
      ...prev,
      allowedEmailDomains: [...prev.allowedEmailDomains, d],
    }));
    setNewDomainInput("");
  };

  const handleRemoveDomain = (d: string) => {
    setFormState((prev) => ({
      ...prev,
      allowedEmailDomains: prev.allowedEmailDomains.filter((x) => x !== d),
    }));
  };

  const handleAddCategory = () => {
    const c = newCategoryInput.trim().toUpperCase().replace(/\s+/g, "_");
    if (!c) return;
    if (formState.eventCategories.includes(c)) {
      toast.error("Category already present");
      return;
    }
    setFormState((prev) => ({
      ...prev,
      eventCategories: [...prev.eventCategories, c],
    }));
    setNewCategoryInput("");
  };

  const handleRemoveCategory = (c: string) => {
    setFormState((prev) => ({
      ...prev,
      eventCategories: prev.eventCategories.filter((x) => x !== c),
    }));
  };

  const handleSave = async () => {
    try {
      await updateConfigMutation.mutateAsync(formState);
    } catch {
      // Handled by toast
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-xl mx-auto py-20 px-4 text-center space-y-4">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-600" />
        <p className="text-xs text-slate-500 font-medium">Loading system configuration singleton...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-16">
      <PageHeader
        title="Institutional System Settings"
        description="Global parameters governing authentication email domains, academic calendar years, Razorpay payment gateway credentials, and category schemas."
        badge={{ text: "Settings Singleton", variant: "indigo" }}
        actions={
          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            disabled={updateConfigMutation.isPending}
            className="rounded-xl text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold gap-1.5 h-9 shadow-xs"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{updateConfigMutation.isPending ? "Saving..." : "Save Configuration"}</span>
          </Button>
        }
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* 1. Academic Calendar & Email Domains */}
        <Card className="rounded-3xl border-slate-200/90 shadow-sm bg-white p-6 sm:p-8 space-y-5">
          <div className="flex items-center gap-2 border-b pb-3 text-xs font-bold uppercase tracking-wider text-slate-400">
            <Calendar className="w-4 h-4 text-indigo-600" />
            <span>Academic Term &amp; Allowed Domains</span>
          </div>

          <div className="space-y-4 text-xs">
            <div className="space-y-1.5">
              <Label className="font-bold text-slate-700">Active Academic Year</Label>
              <Input
                value={formState.academicYear}
                onChange={(e) => setFormState((prev) => ({ ...prev, academicYear: e.target.value }))}
                placeholder="e.g. 2025-26"
                className="h-10 text-xs"
              />
            </div>

            <div className="space-y-2">
              <Label className="font-bold text-slate-700">Allowed Microsoft Email Domains (Guard)</Label>
              <div className="flex flex-wrap gap-2">
                {formState.allowedEmailDomains.map((domain) => (
                  <Badge
                    key={domain}
                    variant="indigo"
                    className="text-xs py-1 px-2.5 rounded-xl font-mono flex items-center gap-1.5"
                  >
                    <span>@{domain}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveDomain(domain)}
                      className="hover:text-rose-300"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>

              <div className="flex gap-2 max-w-sm pt-1">
                <Input
                  value={newDomainInput}
                  onChange={(e) => setNewDomainInput(e.target.value)}
                  placeholder="e.g. cs.apollouniversity.edu.in"
                  className="h-8 text-xs font-mono"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddDomain();
                    }
                  }}
                />
                <Button type="button" size="sm" variant="outline" onClick={handleAddDomain} className="h-8 text-xs rounded-xl">
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  <span>Add</span>
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* 2. Payment Gateway Configuration */}
        <Card className="rounded-3xl border-slate-200/90 shadow-sm bg-white p-6 sm:p-8 space-y-5">
          <div className="flex items-center gap-2 border-b pb-3 text-xs font-bold uppercase tracking-wider text-slate-400">
            <CreditCard className="w-4 h-4 text-indigo-600" />
            <span>Razorpay Payment Gateway</span>
          </div>

          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border">
              <div>
                <strong className="block text-slate-900">Enable Campus Ticketing Payments</strong>
                <span className="text-[10px] text-slate-400">Toggle active Razorpay checkout across all paid event registrations</span>
              </div>
              <input
                type="checkbox"
                checked={formState.paymentEnabled}
                onChange={(e) => setFormState((prev) => ({ ...prev, paymentEnabled: e.target.checked }))}
                className="w-5 h-5 accent-indigo-600 cursor-pointer"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="font-bold text-slate-700">Public Razorpay Key ID</Label>
              <Input
                value={formState.razorpayKeyId}
                onChange={(e) => setFormState((prev) => ({ ...prev, razorpayKeyId: e.target.value }))}
                placeholder="rzp_test_..."
                className="h-10 text-xs font-mono"
              />
              <span className="text-[10px] text-slate-400">Key secret remains secured in Google Cloud Secret Manager.</span>
            </div>

            <div className="space-y-1.5">
              <Label className="font-bold text-slate-700">Support &amp; Inquiries Email</Label>
              <Input
                value={formState.supportEmail}
                onChange={(e) => setFormState((prev) => ({ ...prev, supportEmail: e.target.value }))}
                placeholder="events@apollouniversity.edu.in"
                className="h-10 text-xs"
              />
            </div>
          </div>
        </Card>

        {/* 3. Event Categories Schema Manager */}
        <Card className="rounded-3xl border-slate-200/90 shadow-sm bg-white p-6 sm:p-8 space-y-5">
          <div className="flex items-center gap-2 border-b pb-3 text-xs font-bold uppercase tracking-wider text-slate-400">
            <Layers className="w-4 h-4 text-indigo-600" />
            <span>Event Taxonomy Categories</span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex flex-wrap gap-2">
              {formState.eventCategories.map((cat) => (
                <Badge
                  key={cat}
                  variant="secondary"
                  className="text-xs py-1 px-2.5 rounded-xl font-bold flex items-center gap-1.5"
                >
                  <span>{cat}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveCategory(cat)}
                    className="hover:text-rose-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>

            <div className="flex gap-2 max-w-sm pt-1">
              <Input
                value={newCategoryInput}
                onChange={(e) => setNewCategoryInput(e.target.value)}
                placeholder="e.g. SYMPOSIUM"
                className="h-8 text-xs uppercase"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddCategory();
                  }
                }}
              />
              <Button type="button" size="sm" variant="outline" onClick={handleAddCategory} className="h-8 text-xs rounded-xl">
                <Plus className="w-3.5 h-3.5 mr-1" />
                <span>Add Category</span>
              </Button>
            </div>
          </div>
        </Card>

        {/* 4. Maintenance Mode & Policy */}
        <Card className="rounded-3xl border-slate-200/90 shadow-sm bg-white p-6 sm:p-8 space-y-5">
          <div className="flex items-center gap-2 border-b pb-3 text-xs font-bold uppercase tracking-wider text-slate-400">
            <ShieldAlert className="w-4 h-4 text-rose-600" />
            <span>Maintenance &amp; Legal Policies</span>
          </div>

          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between p-3 bg-rose-50/50 border border-rose-200 rounded-2xl">
              <div>
                <strong className="block text-rose-950">Maintenance Mode Gate</strong>
                <span className="text-[10px] text-rose-700">Restricts student registrations during institutional downtime</span>
              </div>
              <input
                type="checkbox"
                checked={formState.maintenanceMode}
                onChange={(e) => setFormState((prev) => ({ ...prev, maintenanceMode: e.target.checked }))}
                className="w-5 h-5 accent-rose-600 cursor-pointer"
              />
            </div>

            {formState.maintenanceMode && (
              <div className="space-y-1.5">
                <Label className="font-bold text-slate-700">Maintenance Notice Message</Label>
                <Textarea
                  value={formState.maintenanceMessage}
                  onChange={(e) => setFormState((prev) => ({ ...prev, maintenanceMessage: e.target.value }))}
                  rows={2}
                  className="text-xs rounded-xl"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="font-bold text-slate-700">Default Campus Refund Policy</Label>
              <Textarea
                value={formState.defaultRefundPolicy}
                onChange={(e) => setFormState((prev) => ({ ...prev, defaultRefundPolicy: e.target.value }))}
                rows={3}
                className="text-xs rounded-xl"
              />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
export default AdminSettingsPage;
