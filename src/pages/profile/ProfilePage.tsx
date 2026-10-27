import { useState } from "react";
import {
  Shield,
  Key,
  BadgeCheck,
  Save,
} from "lucide-react";
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Badge,
  Input,
  Alert,
} from "@/components/ui";
import { PageHeader } from "@/components/shared";
import { useAuth } from "@/context/AuthContext";
import { getInitials } from "@/utils";

export default function ProfilePage() {
  const { user } = useAuth();
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      <PageHeader
        title="Officer Profile & Digital Credentials"
        description="Manage your department designation, DSC digital signature token, and account authentication settings."
        breadcrumb={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "My Profile" },
        ]}
      />

      {savedSuccess && (
        <Alert variant="success" title="Profile Saved">
          Your profile details and notification preferences have been updated.
        </Alert>
      )}

      {/* Top Profile Card */}
      <Card>
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
          <div className="h-20 w-20 rounded-2xl bg-orange-500 text-white flex items-center justify-center text-2xl font-bold font-plus-jakarta shadow-orange flex-shrink-0">
            {getInitials(user?.name || "Anil Verma")}
          </div>
          <div className="flex-1 text-center sm:text-left min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900 leading-tight">
                {user?.name || "Anil Verma"}
              </h2>
              <Badge variant="primary" className="self-center sm:self-auto">
                <BadgeCheck size={12} />
                {user?.role ? user.role.toUpperCase() : "OFFICER"}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {user?.designation || "Executive Accounts Officer"} · {user?.department || "Public Works Department"}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              Email: <span className="text-slate-700">{user?.email || "officer@garudanetra.gov.in"}</span>
            </p>

            <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <Shield size={13} className="text-green-600" />
                Govt 2FA Enabled
              </span>
              <span className="flex items-center gap-1.5">
                <Key size={13} className="text-orange-500" />
                DSC Token: Class-3 Valid (Exp: 2027)
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Profile Form */}
      <form onSubmit={handleSave} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Official Details</CardTitle>
            <CardDescription>Designation and contact parameters reflected on verification memos</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Full Name"
                defaultValue={user?.name || "Anil Verma"}
                required
              />
              <Input
                label="Official Email Address"
                defaultValue={user?.email || "officer@garudanetra.gov.in"}
                disabled
                hint="Managed by National Informatics Centre (NIC)"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Designation"
                defaultValue={user?.designation || "Executive Accounts Officer"}
              />
              <Input
                label="Department"
                defaultValue={user?.department || "Public Works Department (PWD)"}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Employee Identification Ref"
                defaultValue="EMP-GOVT-PWD-88421"
                disabled
              />
              <Input
                label="Official Phone / Extension"
                defaultValue="+91 11 2345 6789 (Ext: 442)"
              />
            </div>
          </CardContent>
          <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end">
            <Button variant="primary" size="sm" type="submit">
              <Save size={14} />
              Save Profile Changes
            </Button>
          </div>
        </Card>
      </form>
    </div>
  );
}
