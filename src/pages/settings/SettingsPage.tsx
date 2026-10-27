import { useState } from "react";
import {
  Bell,
  Shield,
  Server,
  Save,
  Check,
} from "lucide-react";
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Input,
  Switch,
  Alert,
} from "@/components/ui";
import { PageHeader } from "@/components/shared";

export default function SettingsPage() {
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [strictSignatures, setStrictSignatures] = useState(true);
  const [autoReminder, setAutoReminder] = useState(true);
  const [sftpAutoSync, setSftpAutoSync] = useState(true);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(null as unknown as boolean), 2500);
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl">
      <PageHeader
        title="System Configuration & Preferences"
        description="Configure automated maturity notifications, bank API sync frequencies, and multi-signature authorization rules."
        breadcrumb={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Settings" },
        ]}
        actions={
          <Button variant="primary" size="sm" onClick={handleSave}>
            {savedSuccess ? (
              <>
                <Check size={14} /> Saved Changes
              </>
            ) : (
              <>
                <Save size={14} /> Save Configuration
              </>
            )}
          </Button>
        }
      />

      {savedSuccess && (
        <Alert variant="success" title="Settings Updated Successfully">
          Configuration has been saved and applied to active background cron tasks.
        </Alert>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Escalation & Alert Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell size={17} className="text-orange-600" />
              Maturity Notification Escalation
            </CardTitle>
            <CardDescription>Define threshold intervals for automated alerts sent to depositors and finance officers</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                label="Primary Warning Interval"
                defaultValue="45 Days"
                hint="First email & SMS to contractor"
              />
              <Input
                label="Urgent Warning Interval"
                defaultValue="30 Days"
                hint="Flagged in officer dashboard"
              />
              <Input
                label="Critical Warning Interval"
                defaultValue="15 Days"
                hint="Escalated to Executive Engineer"
              />
            </div>
            <div className="pt-2">
              <Switch
                label="Enable Automated Daily SMS / Email Dispatch"
                description="Automatically dispatch notifications via NIC SMS Gateway and Govt SMTP server at 09:00 AM IST."
                checked={autoReminder}
                onCheckedChange={setAutoReminder}
              />
            </div>
          </CardContent>
        </Card>

        {/* Security & Multi-Signature Approvals */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield size={17} className="text-orange-600" />
              Workflow Security & Signatures
            </CardTitle>
            <CardDescription>Enforce statutory financial control standards before release or renewal</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Switch
              label="Enforce Dual-Signature Release Protocol"
              description="Require independent digital sign-off from both Accounts Officer and Executive Engineer prior to issuing bank discharge voucher."
              checked={strictSignatures}
              onCheckedChange={setStrictSignatures}
            />
            <div className="pt-2 border-t border-slate-100">
              <Switch
                label="SFTP Core Banking Midnight Ledger Synchronization"
                description="Synchronize daily balance and lien marking updates with SBI, HDFC, and PNB SFTP gateways at 00:00 AM IST."
                checked={sftpAutoSync}
                onCheckedChange={setSftpAutoSync}
              />
            </div>
          </CardContent>
        </Card>

        {/* Department Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server size={17} className="text-orange-600" />
              Department Identity & Gateway
            </CardTitle>
            <CardDescription>Government department details embedded on official discharge vouchers</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Department Name"
                defaultValue="Public Works Department (PWD)"
              />
              <Input
                label="Zone / Division"
                defaultValue="North Zone — Civil Division IV, New Delhi"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Finance DDO Code"
                defaultValue="DDO-DEL-PWD-90214"
              />
              <Input
                label="Official Contact Email"
                defaultValue="finance.pwd.delhi@garudanetra.gov.in"
              />
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
