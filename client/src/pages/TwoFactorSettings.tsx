import { useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { 
  Shield, 
  Smartphone, 
  Key, 
  Copy, 
  Check, 
  AlertTriangle,
  Trash2,
  RefreshCw,
  Monitor,
  Clock
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

export default function TwoFactorSettings() {
  const utils = trpc.useUtils();
  
  // State
  const [setupDialogOpen, setSetupDialogOpen] = useState(false);
  const [disableDialogOpen, setDisableDialogOpen] = useState(false);
  const [backupCodesDialogOpen, setBackupCodesDialogOpen] = useState(false);
  const [regenerateDialogOpen, setRegenerateDialogOpen] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [manualKey, setManualKey] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [setupStep, setSetupStep] = useState<"qr" | "verify">("qr");

  // Queries
  const { data: status, isLoading: statusLoading } = trpc.twoFactor.getStatus.useQuery();
  const { data: trustedDevices, isLoading: devicesLoading } = trpc.twoFactor.getTrustedDevices.useQuery();

  // Mutations
  const generateSecretMutation = trpc.twoFactor.generateSecret.useMutation({
    onSuccess: (data) => {
      setQrCodeUrl(data.qrCodeUrl);
      setManualKey(data.manualEntryKey);
      setSetupStep("qr");
      setSetupDialogOpen(true);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const verifyAndEnableMutation = trpc.twoFactor.verifyAndEnable.useMutation({
    onSuccess: (data) => {
      setBackupCodes(data.backupCodes || []);
      setSetupDialogOpen(false);
      setBackupCodesDialogOpen(true);
      setVerificationCode("");
      utils.twoFactor.getStatus.invalidate();
      toast.success("Two-factor authentication enabled!");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const disableMutation = trpc.twoFactor.disable.useMutation({
    onSuccess: () => {
      setDisableDialogOpen(false);
      setVerificationCode("");
      utils.twoFactor.getStatus.invalidate();
      utils.twoFactor.getTrustedDevices.invalidate();
      toast.success("Two-factor authentication disabled");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const regenerateCodesMutation = trpc.twoFactor.regenerateBackupCodes.useMutation({
    onSuccess: (data) => {
      setBackupCodes(data.backupCodes || []);
      setRegenerateDialogOpen(false);
      setBackupCodesDialogOpen(true);
      setVerificationCode("");
      utils.twoFactor.getStatus.invalidate();
      toast.success("Backup codes regenerated");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const removeDeviceMutation = trpc.twoFactor.removeTrustedDevice.useMutation({
    onSuccess: () => {
      utils.twoFactor.getTrustedDevices.invalidate();
      toast.success("Device removed");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const removeAllDevicesMutation = trpc.twoFactor.removeAllTrustedDevices.useMutation({
    onSuccess: () => {
      utils.twoFactor.getTrustedDevices.invalidate();
      toast.success("All devices removed");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleStartSetup = () => {
    generateSecretMutation.mutate();
  };

  const handleVerify = () => {
    if (verificationCode.length !== 6) {
      toast.error("Please enter a 6-digit code");
      return;
    }
    verifyAndEnableMutation.mutate({ code: verificationCode });
  };

  const handleDisable = () => {
    if (verificationCode.length < 6) {
      toast.error("Please enter your verification code");
      return;
    }
    disableMutation.mutate({ code: verificationCode });
  };

  const handleRegenerate = () => {
    if (verificationCode.length < 6) {
      toast.error("Please enter your verification code");
      return;
    }
    regenerateCodesMutation.mutate({ code: verificationCode });
  };

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedCode(text);
    setTimeout(() => setCopiedCode(null), 2000);
    toast.success("Copied to clipboard");
  };

  const copyAllBackupCodes = async () => {
    const text = backupCodes.join("\n");
    await navigator.clipboard.writeText(text);
    toast.success("All backup codes copied");
  };

  if (statusLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-48 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Shield className="h-8 w-8 text-primary" />
            Two-Factor Authentication
          </h1>
          <p className="text-muted-foreground mt-1">
            Add an extra layer of security to your account
          </p>
        </div>

        {/* Status Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Smartphone className="h-6 w-6 text-primary" />
                <div>
                  <CardTitle>Authenticator App</CardTitle>
                  <CardDescription>
                    Use an authenticator app like Google Authenticator or Authy
                  </CardDescription>
                </div>
              </div>
              {status?.enabled ? (
                <Badge variant="default" className="bg-green-600">
                  <Check className="h-3 w-3 mr-1" />
                  Enabled
                </Badge>
              ) : (
                <Badge variant="secondary">Not Enabled</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {status?.enabled ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Your account is protected with two-factor authentication. 
                  You'll need your authenticator app to sign in.
                </p>
                
                {status.lastVerifiedAt && (
                  <p className="text-xs text-muted-foreground">
                    Last verified: {formatDistanceToNow(new Date(status.lastVerifiedAt), { addSuffix: true })}
                  </p>
                )}

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setDisableDialogOpen(true)}
                  >
                    Disable 2FA
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Two-factor authentication adds an extra layer of security by requiring 
                  a code from your phone in addition to your password.
                </p>
                <Button onClick={handleStartSetup} disabled={generateSecretMutation.isPending}>
                  <Shield className="h-4 w-4 mr-2" />
                  Enable 2FA
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Backup Codes Card */}
        {status?.enabled && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Key className="h-6 w-6 text-yellow-500" />
                  <div>
                    <CardTitle>Backup Codes</CardTitle>
                    <CardDescription>
                      Use these codes if you lose access to your authenticator app
                    </CardDescription>
                  </div>
                </div>
                <Badge variant={status.backupCodesRemaining > 3 ? "secondary" : "destructive"}>
                  {status.backupCodesRemaining} remaining
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {status.backupCodesRemaining <= 3 && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-sm">
                      You're running low on backup codes. Consider generating new ones.
                    </span>
                  </div>
                )}
                <Button
                  variant="outline"
                  onClick={() => setRegenerateDialogOpen(true)}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Generate New Backup Codes
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Trusted Devices Card */}
        {status?.enabled && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Monitor className="h-6 w-6 text-blue-500" />
                  <div>
                    <CardTitle>Trusted Devices</CardTitle>
                    <CardDescription>
                      Devices that don't require 2FA verification
                    </CardDescription>
                  </div>
                </div>
                {trustedDevices && trustedDevices.length > 0 && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm">
                        Remove All
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remove All Trusted Devices?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will require 2FA verification on all devices next time you sign in.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => removeAllDevicesMutation.mutate()}>
                          Remove All
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {devicesLoading ? (
                <div className="space-y-2">
                  {[1, 2].map((i) => (
                    <Skeleton key={i} className="h-16" />
                  ))}
                </div>
              ) : trustedDevices && trustedDevices.length > 0 ? (
                <div className="space-y-2">
                  {trustedDevices.map((device) => (
                    <div
                      key={device.id}
                      className="flex items-center justify-between p-3 rounded-lg border"
                    >
                      <div className="flex items-center gap-3">
                        <Monitor className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium text-sm">{device.deviceName}</p>
                          <p className="text-xs text-muted-foreground">
                            {device.ipAddress} • Last used {device.lastUsedAt ? formatDistanceToNow(new Date(device.lastUsedAt), { addSuffix: true }) : "never"}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeDeviceMutation.mutate({ deviceId: device.id })}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No trusted devices. You'll need to verify with 2FA on every sign in.
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Setup Dialog */}
        <Dialog open={setupDialogOpen} onOpenChange={setSetupDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Set Up Two-Factor Authentication</DialogTitle>
              <DialogDescription>
                {setupStep === "qr" 
                  ? "Scan the QR code with your authenticator app"
                  : "Enter the 6-digit code from your authenticator app"
                }
              </DialogDescription>
            </DialogHeader>

            {setupStep === "qr" ? (
              <div className="space-y-4">
                <div className="flex justify-center">
                  {qrCodeUrl && (
                    <img src={qrCodeUrl} alt="QR Code" className="w-48 h-48" />
                  )}
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-2">
                    Can't scan? Enter this code manually:
                  </p>
                  <div className="flex items-center justify-center gap-2">
                    <code className="bg-muted px-3 py-1 rounded text-sm font-mono">
                      {manualKey}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(manualKey.replace(/\s/g, ""))}
                    >
                      {copiedCode === manualKey.replace(/\s/g, "") ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
                <Button className="w-full" onClick={() => setSetupStep("verify")}>
                  Continue
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Verification Code</Label>
                  <Input
                    type="text"
                    placeholder="000000"
                    maxLength={6}
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ""))}
                    className="text-center text-2xl tracking-widest"
                  />
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setSetupStep("qr")} className="flex-1">
                    Back
                  </Button>
                  <Button 
                    onClick={handleVerify} 
                    disabled={verifyAndEnableMutation.isPending}
                    className="flex-1"
                  >
                    Verify & Enable
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Backup Codes Dialog */}
        <Dialog open={backupCodesDialogOpen} onOpenChange={setBackupCodesDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Key className="h-5 w-5 text-yellow-500" />
                Save Your Backup Codes
              </DialogTitle>
              <DialogDescription>
                Store these codes in a safe place. You can use them to access your account if you lose your authenticator device.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-lg">
                <div className="grid grid-cols-2 gap-2">
                  {backupCodes.map((code, index) => (
                    <code key={index} className="text-sm font-mono">
                      {code}
                    </code>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200">
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                <span className="text-sm">
                  Each code can only be used once. Keep them secure!
                </span>
              </div>

              <Button onClick={copyAllBackupCodes} variant="outline" className="w-full">
                <Copy className="h-4 w-4 mr-2" />
                Copy All Codes
              </Button>
            </div>

            <DialogFooter>
              <Button onClick={() => setBackupCodesDialogOpen(false)}>
                I've Saved My Codes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Disable Dialog */}
        <Dialog open={disableDialogOpen} onOpenChange={setDisableDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Disable Two-Factor Authentication</DialogTitle>
              <DialogDescription>
                Enter your verification code to disable 2FA. This will make your account less secure.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Verification Code</Label>
                <Input
                  type="text"
                  placeholder="Enter code from app or backup code"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  className="text-center"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDisableDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleDisable}
                disabled={disableMutation.isPending}
              >
                Disable 2FA
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Regenerate Codes Dialog */}
        <Dialog open={regenerateDialogOpen} onOpenChange={setRegenerateDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Generate New Backup Codes</DialogTitle>
              <DialogDescription>
                This will invalidate all existing backup codes. Enter your verification code to continue.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Verification Code</Label>
                <Input
                  type="text"
                  placeholder="Enter code from app"
                  maxLength={6}
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ""))}
                  className="text-center text-2xl tracking-widest"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setRegenerateDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleRegenerate}
                disabled={regenerateCodesMutation.isPending}
              >
                Generate New Codes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
