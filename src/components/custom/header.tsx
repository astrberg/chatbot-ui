import { ThemeToggle } from "./theme-toggle";
import GoogleLoginButton from "../auth/GoogleLogin";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  isLoggedIn: boolean;
  onLoginSuccess: (token: string) => void;
  onLogout: () => void;
  onTokenExpired: () => void;
}

export const Header = ({ isLoggedIn, onLoginSuccess, onLogout, onTokenExpired }: HeaderProps) => {
  return (
    <header className="flex items-center justify-between px-2 sm:px-4 py-2 bg-background text-black dark:text-white w-full">
      <div className="flex items-center space-x-1 sm:space-x-2">
        <ThemeToggle />
        {isLoggedIn ? (
          <Button onClick={onLogout}>
            Logout
          </Button>
        ) : (
          <GoogleLoginButton 
            onLoginSuccess={onLoginSuccess} 
            onTokenExpired={onTokenExpired}
          />
        )}
      </div>
    </header>
  );
};