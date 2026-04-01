import { useSigninMutation } from "@/services/api/auth";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useState, useRef } from "react";
import { toast } from "react-toastify";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../ui/card";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Loader2 } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import GithubLoginButton from "../atoms/GithubLoginButton";

const LoginForm = () => {
  const [hasError, setHasError] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as any)?.from?.pathname || "/messages";
  const queryClient = useQueryClient();

  const getProfile = useAuthStore((state) => state.getProfile);

  const signinMutation = useSigninMutation({
    onSuccess: async () => {
      await getProfile();
      queryClient.invalidateQueries({ queryKey: ["user", "current"] });
      setHasError(false);
      toast.success("Sign in successfully");

      // Navigate after auth store is updated
      navigate(from, { replace: true });
    },
    onError: (_error) => {
      setHasError(true);
      toast.error("Invalid email or password. Please try again.");
      emailRef.current?.focus();
      emailRef.current?.select();
    },
  });

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setHasError(false);
    const email = emailRef.current?.value || "";
    const password = passwordRef.current?.value || "";
    signinMutation.mutate({ email, password });
  };

  const handleInputFocus = () => {
    if (hasError) {
      setHasError(false);
    }
  };

  const handleGoogleLogin = () => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';
    window.location.href = `${apiUrl}/auth/google`;
  };

  const isLoading = signinMutation.isPending;

  const inputErrorClass = hasError
    ? "border-destructive/40 focus-visible:border-destructive/60"
    : "border-border/30 focus-visible:border-primary/40";

  return (
    <Card className="w-full max-w-md border-none shadow-none bg-card/50 backdrop-blur-sm">
      <CardHeader className="space-y-4 pb-8">
        <CardTitle className="text-3xl font-light tracking-wide text-foreground">
          Welcome back
        </CardTitle>
        <CardDescription className="text-sm font-light leading-relaxed text-muted-foreground/60 tracking-wide">
          Enter your credentials to continue
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label
              htmlFor="email"
              className={`text-xs font-light tracking-wide uppercase ${hasError ? "text-destructive/70" : "text-muted-foreground/60"}`}
            >
              Email
            </Label>
            <Input
              ref={emailRef}
              id="email"
              type="email"
              placeholder="name@example.com"
              defaultValue="admin@gmail.com"
              onFocus={handleInputFocus}
              className={`h-11 rounded-lg text-sm font-light bg-background/50 transition-all duration-200 ${inputErrorClass}`}
              required
              disabled={isLoading}
              aria-invalid={hasError}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label
                htmlFor="password"
                className={`text-xs font-light tracking-wide uppercase ${hasError ? "text-destructive/70" : "text-muted-foreground/60"}`}
              >
                Password
              </Label>
              <Link to="/forgot-password" className="text-xs font-light text-accent/70 hover:text-accent transition-colors tracking-wide">
                Forgot?
              </Link>
            </div>
            <Input
              ref={passwordRef}
              id="password"
              type="password"
              defaultValue="Admin123"
              onFocus={handleInputFocus}
              className={`h-11 rounded-lg text-sm font-light bg-background/50 transition-all duration-200 ${inputErrorClass}`}
              required
              disabled={isLoading}
              aria-invalid={hasError}
            />
          </div>

          <Button
            type="submit"
            className="w-full h-11 text-sm font-light tracking-wide mt-8 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg disabled:opacity-40 transition-all duration-200 shadow-none"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin opacity-60" />
                Signing in
              </>
            ) : (
              "Sign in"
            )}
          </Button>
        </form>

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border/30" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground/60">
              Or continue with
            </span>
          </div>
        </div>

          <div className="flex justify-center">
            <GoogleLogin
              onSuccess={async (credentialResponse) => {
                if (credentialResponse.credential) {
                  try {
                    await authService.googleSignIn(credentialResponse.credential);
                    await getProfile();
                    queryClient.invalidateQueries({ queryKey: ["user", "current"] });
                    toast.success("Sign in successfully");
                    navigate(from, { replace: true });
                  } catch (error) {
                    console.error('Google Sign In Failed', error);
                    toast.error("Google Sign In Failed");
                  }
                }
              }}
              onError={() => {
                toast.error("Google Sign In Failed");
              }}
              useOneTap
              theme="filled_black"
              shape="pill"
            />
          </div>
        </form>
      </CardContent>

      <CardFooter className="flex justify-center pt-6">
        <p className="text-xs font-light text-muted-foreground/60 tracking-wide">
          {"Don't have an account? "}
          <Link to="/register" className="text-accent/80 hover:text-accent transition-colors">
            Sign up
          </Link>
        </p>
      </CardFooter>
    </Card >
  );
};

export default LoginForm;
