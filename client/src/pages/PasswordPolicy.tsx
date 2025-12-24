import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { 
  KeyRound, 
  Save,
  Loader2,
  Check,
  X,
  Shield,
  Clock,
  History,
  Lock
} from "lucide-react";
import { toast } from "sonner";

export default function PasswordPolicy() {
  const utils = trpc.useUtils();
  
  // Queries
  const { data: policyData, isLoading } = trpc.passwordPolicy.get.useQuery();

  // Local state for form
  const [minLength, setMinLength] = useState(8);
  const [maxLength, setMaxLength] = useState(128);
  const [requireUppercase, setRequireUppercase] = useState(true);
  const [requireLowercase, setRequireLowercase] = useState(true);
  const [requireNumbers, setRequireNumbers] = useState(true);
  const [requireSpecialChars, setRequireSpecialChars] = useState(false);
  const [expirationDays, setExpirationDays] = useState(0);
  const [warningDays, setWarningDays] = useState(14);
  const [historyCount, setHistoryCount] = useState(5);
  const [maxFailedAttempts, setMaxFailedAttempts] = useState(5);
  const [lockoutDurationMinutes, setLockoutDurationMinutes] = useState(15);

  // Test password state
  const [testPassword, setTestPassword] = useState("");
  const [strengthResult, setStrengthResult] = useState<{
    score: number;
    label: string;
    color: string;
  } | null>(null);

  // Initialize form with fetched data
  useEffect(() => {
    if (policyData && 'policy' in policyData && policyData.policy) {
      const p = policyData.policy;
      setMinLength(p.minLength);
      setMaxLength(p.maxLength);
      setRequireUppercase(p.requireUppercase);
      setRequireLowercase(p.requireLowercase);
      setRequireNumbers(p.requireNumbers);
      setRequireSpecialChars(p.requireSpecialChars);
      setExpirationDays(p.expirationDays);
      setWarningDays(p.warningDays);
      setHistoryCount(p.historyCount);
      setMaxFailedAttempts(p.maxFailedAttempts);
      setLockoutDurationMinutes(p.lockoutDurationMinutes);
    }
  }, [policyData]);

  // Mutations
  const updateMutation = trpc.passwordPolicy.update.useMutation({
    onSuccess: () => {
      utils.passwordPolicy.get.invalidate();
      toast.success("Password policy updated successfully");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const strengthMutation = trpc.passwordPolicy.strength.useMutation({
    onSuccess: (data) => {
      setStrengthResult(data);
    },
  });

  const handleSave = () => {
    updateMutation.mutate({
      minLength,
      maxLength,
      requireUppercase,
      requireLowercase,
      requireNumbers,
      requireSpecialChars,
      expirationDays,
      warningDays,
      historyCount,
      maxFailedAttempts,
      lockoutDurationMinutes,
    });
  };

  const handleTestPassword = (password: string) => {
    setTestPassword(password);
    if (password.length > 0) {
      strengthMutation.mutate({ password });
    } else {
      setStrengthResult(null);
    }
  };

  const getStrengthColor = (color: string) => {
    switch (color) {
      case "red": return "bg-red-500";
      case "orange": return "bg-orange-500";
      case "yellow": return "bg-yellow-500";
      case "blue": return "bg-blue-500";
      case "green": return "bg-green-500";
      default: return "bg-gray-500";
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-96 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <KeyRound className="h-8 w-8 text-primary" />
              Password Policy
            </h1>
            <p className="text-muted-foreground mt-1">
              Configure password requirements for your workspace
            </p>
          </div>
          <Button onClick={handleSave} disabled={updateMutation.isPending}>
            {updateMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Strength Requirements */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Strength Requirements
              </CardTitle>
              <CardDescription>
                Set minimum requirements for password complexity
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Length */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Minimum Length</Label>
                  <span className="text-sm font-medium">{minLength} characters</span>
                </div>
                <Slider
                  value={[minLength]}
                  onValueChange={([v]) => setMinLength(v)}
                  min={6}
                  max={32}
                  step={1}
                />
              </div>

              {/* Character requirements */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Require Uppercase Letters</Label>
                    <p className="text-sm text-muted-foreground">At least one A-Z</p>
                  </div>
                  <Switch
                    checked={requireUppercase}
                    onCheckedChange={setRequireUppercase}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Require Lowercase Letters</Label>
                    <p className="text-sm text-muted-foreground">At least one a-z</p>
                  </div>
                  <Switch
                    checked={requireLowercase}
                    onCheckedChange={setRequireLowercase}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Require Numbers</Label>
                    <p className="text-sm text-muted-foreground">At least one 0-9</p>
                  </div>
                  <Switch
                    checked={requireNumbers}
                    onCheckedChange={setRequireNumbers}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Require Special Characters</Label>
                    <p className="text-sm text-muted-foreground">At least one !@#$%^&*...</p>
                  </div>
                  <Switch
                    checked={requireSpecialChars}
                    onCheckedChange={setRequireSpecialChars}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Expiration & History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Expiration & History
              </CardTitle>
              <CardDescription>
                Configure password expiration and reuse prevention
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Expiration */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Password Expiration</Label>
                  <span className="text-sm font-medium">
                    {expirationDays === 0 ? "Never" : `${expirationDays} days`}
                  </span>
                </div>
                <Slider
                  value={[expirationDays]}
                  onValueChange={([v]) => setExpirationDays(v)}
                  min={0}
                  max={365}
                  step={30}
                />
                <p className="text-xs text-muted-foreground">
                  Set to 0 for no expiration. Common values: 90 days (enterprise), 180 days (standard)
                </p>
              </div>

              {expirationDays > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Warning Before Expiration</Label>
                    <span className="text-sm font-medium">{warningDays} days</span>
                  </div>
                  <Slider
                    value={[warningDays]}
                    onValueChange={([v]) => setWarningDays(v)}
                    min={1}
                    max={30}
                    step={1}
                  />
                </div>
              )}

              {/* History */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="flex items-center gap-2">
                      <History className="h-4 w-4" />
                      Password History
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Prevent reuse of recent passwords
                    </p>
                  </div>
                  <span className="text-sm font-medium">
                    {historyCount === 0 ? "Disabled" : `Last ${historyCount}`}
                  </span>
                </div>
                <Slider
                  value={[historyCount]}
                  onValueChange={([v]) => setHistoryCount(v)}
                  min={0}
                  max={24}
                  step={1}
                />
              </div>
            </CardContent>
          </Card>

          {/* Lockout Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Account Lockout
              </CardTitle>
              <CardDescription>
                Protect against brute force attacks
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Max Failed Attempts</Label>
                  <span className="text-sm font-medium">{maxFailedAttempts} attempts</span>
                </div>
                <Slider
                  value={[maxFailedAttempts]}
                  onValueChange={([v]) => setMaxFailedAttempts(v)}
                  min={3}
                  max={10}
                  step={1}
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Lockout Duration</Label>
                  <span className="text-sm font-medium">{lockoutDurationMinutes} minutes</span>
                </div>
                <Slider
                  value={[lockoutDurationMinutes]}
                  onValueChange={([v]) => setLockoutDurationMinutes(v)}
                  min={5}
                  max={60}
                  step={5}
                />
              </div>
            </CardContent>
          </Card>

          {/* Password Tester */}
          <Card>
            <CardHeader>
              <CardTitle>Password Strength Tester</CardTitle>
              <CardDescription>
                Test a password against your current policy
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Test Password</Label>
                <Input
                  type="password"
                  placeholder="Enter a password to test..."
                  value={testPassword}
                  onChange={(e) => handleTestPassword(e.target.value)}
                />
              </div>

              {strengthResult && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Strength: {strengthResult.label}</span>
                    <span className="text-sm text-muted-foreground">{strengthResult.score}%</span>
                  </div>
                  <Progress 
                    value={strengthResult.score} 
                    className={`h-2 ${getStrengthColor(strengthResult.color)}`}
                  />
                </div>
              )}

              {/* Requirements checklist */}
              {policyData && 'requirements' in policyData && policyData.requirements && (
                <div className="space-y-2 pt-4 border-t">
                  <p className="text-sm font-medium">Requirements:</p>
                  {policyData.requirements.map((req: string, i: number) => {
                    // Simple check based on requirement text
                    let passed = false;
                    if (testPassword) {
                      if (req.includes("characters") && testPassword.length >= minLength) passed = true;
                      if (req.includes("uppercase") && /[A-Z]/.test(testPassword)) passed = true;
                      if (req.includes("lowercase") && /[a-z]/.test(testPassword)) passed = true;
                      if (req.includes("number") && /[0-9]/.test(testPassword)) passed = true;
                      if (req.includes("special") && /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(testPassword)) passed = true;
                    }
                    
                    return (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        {testPassword ? (
                          passed ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : (
                            <X className="h-4 w-4 text-red-500" />
                          )
                        ) : (
                          <div className="h-4 w-4 rounded-full border" />
                        )}
                        <span className={testPassword && !passed ? "text-red-500" : ""}>{req}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
