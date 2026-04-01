import { useSignupMutation } from "@/services/api/auth";
import { Link, useNavigate } from "react-router-dom";
import { useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";
import { Label } from "@radix-ui/react-label";
import { Button } from "../ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "../ui/card";
import { Input } from "../ui/input";
import { Check, Loader2 } from "lucide-react";
import { validatePassword, validateEmail } from "@/lib/validators";

const RegisterForm = () => {
  const emailRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const [hasError, setHasError] = useState(false);

  // Use state for password fields to enable reactive validation
  const [password, setPassword] = useState("Admin123");
  const [confirmPassword, setConfirmPassword] = useState("Admin123");

  // Reactive validation checks based on state
  const hasMinLength = useMemo(() => password.length >= 6, [password]);
  const hasNumber = useMemo(() => /\d/.test(password), [password]);
  const hasAlphabet = useMemo(() => /[a-zA-Z]/.test(password), [password]);
  const hasConfirmPassword = useMemo(() => confirmPassword.length > 0 && confirmPassword === password, [confirmPassword, password]);

  const navigate = useNavigate();

  const signupMutation = useSignupMutation({
    onSuccess: () => {
      // Registration successful, redirect to login
      toast.success("Registration successful! Please sign in with your credentials.");
      navigate("/login");
    },
    onError: () => {
      setHasError(true);
      toast.error("An error occurred during registration");
      nameRef.current?.focus();
    },
  });

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setHasError(false);

    const email = emailRef.current?.value || "";
    const username = nameRef.current?.value || "";

    // Validate required fields
    if (!email || !password || !confirmPassword || !username) {
      toast.error("Please fill in all required fields");
      setHasError(true);
      return;
    }

    // Validate username length
    if (username.length < 3) {
      toast.error("Username must be at least 3 characters");
      setHasError(true);
      nameRef.current?.focus();
      return;
    }

    // Validate email format
    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      toast.error(emailValidation.error);
      setHasError(true);
      emailRef.current?.focus();
      return;
    }

    // Validate password strength (must contain letters and numbers)
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      toast.error(passwordValidation.error);
      setHasError(true);
      // Password input is controlled, focus handled by form
      return;
    }

    // Validate password match
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      setHasError(true);
      // Confirm password input is controlled, focus handled by form
      return;
    }

    // Prepare registration data
    const registrationData = {
      email,
      password,
      username,
    };

    signupMutation.mutate(registrationData);
  };

  const isLoading = signupMutation.isPending;

  // Error styling for inputs - Nordic minimalism: subtle error indication
  const inputErrorClass = hasError
    ? "border-destructive/40 focus-visible:border-destructive/60"
    : "border-border/30 focus-visible:border-primary/40";

  const handleInputFocus = () => {
    if (hasError) {
      setHasError(false);
    }
  };

  return (
    <Card className="w-full max-w-md border-none shadow-none bg-card/50 backdrop-blur-sm">
      <CardHeader className="space-y-4 pb-8">
        <CardTitle className="text-3xl font-light tracking-wide text-foreground">
          Create account
        </CardTitle>
        <CardDescription className="text-sm font-light leading-relaxed text-muted-foreground/60 tracking-wide">
          Enter your information to get started
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label
              htmlFor="name"
              className={`text-xs font-light tracking-wide uppercase ${hasError ? "text-destructive/70" : "text-muted-foreground/60"}`}
            >
              Full name
            </Label>
            <Input
              id="name"
              type="text"
              placeholder="John Doe"
              defaultValue="Admin"
              ref={nameRef}
              onFocus={handleInputFocus}
              className={`h-11 rounded-lg text-sm font-light bg-background/50 transition-all duration-200 ${inputErrorClass}`}
              required
              disabled={isLoading}
            />
            <p className="text-[10px] font-light text-muted-foreground/50 tracking-wide pt-1">Minimum 3 characters</p>
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="email"
              className={`text-xs font-light tracking-wide uppercase ${hasError ? "text-destructive/70" : "text-muted-foreground/60"}`}
            >
              Email
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="name@example.com"
              defaultValue="admin@gmail.com"
              ref={emailRef}
              onFocus={handleInputFocus}
              className={`h-11 rounded-lg text-sm font-light bg-background/50 transition-all duration-200 ${inputErrorClass}`}
              required
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="password"
              className={`text-xs font-light tracking-wide uppercase ${hasError ? "text-destructive/70" : "text-muted-foreground/60"}`}
            >
              Password
            </Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={handleInputFocus}
              className={`h-11 rounded-lg text-sm font-light bg-background/50 transition-all duration-200 ${inputErrorClass}`}
              required
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="confirmPassword"
              className={`text-xs font-light tracking-wide uppercase ${hasError ? "text-destructive/70" : "text-muted-foreground/60"}`}
            >
              Confirm password
            </Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              onFocus={handleInputFocus}
              className={`h-11 rounded-lg text-sm font-light bg-background/50 transition-all duration-200 ${inputErrorClass}`}
              required
              disabled={isLoading}
            />

            <div className="space-y-2.5 pt-4">
              <div className="flex items-center gap-2.5">
                <div
                  className="flex h-4 w-4 items-center justify-center rounded-full border transition-all duration-200"
                  style={{
                    borderColor: hasMinLength ? "var(--accent)" : "var(--border)",
                    backgroundColor: hasMinLength ? "var(--accent)" : "transparent",
                    opacity: hasMinLength ? 0.9 : 0.3,
                  }}
                >
                  {hasMinLength && <Check className="h-3 w-3" style={{ color: "var(--accent-foreground)" }} />}
                </div>
                <span className="text-[11px] font-light tracking-wide" style={{ color: hasMinLength ? "var(--foreground)" : "var(--muted-foreground)", opacity: hasMinLength ? 0.8 : 0.5 }}>
                  Min 6 characters
                </span>
              </div>

              <div className="flex items-center gap-2.5">
                <div
                  className="flex h-4 w-4 items-center justify-center rounded-full border transition-all duration-200"
                  style={{
                    borderColor: hasNumber ? "var(--accent)" : "var(--border)",
                    backgroundColor: hasNumber ? "var(--accent)" : "transparent",
                    opacity: hasNumber ? 0.9 : 0.3,
                  }}
                >
                  {hasNumber && <Check className="h-3 w-3" style={{ color: "var(--accent-foreground)" }} />}
                </div>
                <span className="text-[11px] font-light tracking-wide" style={{ color: hasNumber ? "var(--foreground)" : "var(--muted-foreground)", opacity: hasNumber ? 0.8 : 0.5 }}>
                  Contains number
                </span>
              </div>

              <div className="flex items-center gap-2.5">
                <div
                  className="flex h-4 w-4 items-center justify-center rounded-full border transition-all duration-200"
                  style={{
                    borderColor: hasAlphabet ? "var(--accent)" : "var(--border)",
                    backgroundColor: hasAlphabet ? "var(--accent)" : "transparent",
                    opacity: hasAlphabet ? 0.9 : 0.3,
                  }}
                >
                  {hasAlphabet && <Check className="h-3 w-3" style={{ color: "var(--accent-foreground)" }} />}
                </div>
                <span className="text-[11px] font-light tracking-wide" style={{ color: hasAlphabet ? "var(--foreground)" : "var(--muted-foreground)", opacity: hasAlphabet ? 0.8 : 0.5 }}>
                  Contains letter
                </span>
              </div>

              <div className="flex items-center gap-2.5">
                <div
                  className="flex h-4 w-4 items-center justify-center rounded-full border transition-all duration-200"
                  style={{
                    borderColor: hasConfirmPassword ? "var(--accent)" : "var(--border)",
                    backgroundColor: hasConfirmPassword ? "var(--accent)" : "transparent",
                    opacity: hasConfirmPassword ? 0.9 : 0.3,
                  }}
                >
                  {hasConfirmPassword && <Check className="h-3 w-3" style={{ color: "var(--accent-foreground)" }} />}
                </div>
                <span className="text-[11px] font-light tracking-wide" style={{ color: hasConfirmPassword ? "var(--foreground)" : "var(--muted-foreground)", opacity: hasConfirmPassword ? 0.8 : 0.5 }}>
                  Passwords match
                </span>
              </div>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full h-11 text-sm font-light tracking-wide mt-8 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg disabled:opacity-40 transition-all duration-200 shadow-none"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin opacity-60" />
                Creating account
              </>
            ) : (
              "Create account"
            )}
          </Button>
        </form>
      </CardContent>

      <CardFooter className="flex justify-center pt-6">
        <p className="text-xs font-light text-muted-foreground/60 tracking-wide">
          {"Already have an account? "}
          <Link to="/login" className="text-accent/80 hover:text-accent transition-colors">
            Sign in
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
};

export default RegisterForm;
