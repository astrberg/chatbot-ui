import { GoogleOAuthProvider, GoogleLogin } from "@react-oauth/google";
import  { jwtDecode } from "jwt-decode";
import { useEffect } from "react";

const GoogleLoginButton = ({ onLoginSuccess, onTokenExpired }: { 
  onLoginSuccess: (token: string) => void; 
  onTokenExpired: () => void;
}) => {
  useEffect(() => {
    const token = localStorage.getItem("google_id_token");
    if (token) {
      try {
        const decodedToken: { exp: number } = jwtDecode(token);
        const currentTime = Math.floor(Date.now() / 1000);

        if (decodedToken.exp > currentTime) {
          onLoginSuccess(token);
        } else {
          localStorage.removeItem("google_id_token");
          onTokenExpired();
        }
      } catch (error) {
        console.error("Invalid token:", error);
        localStorage.removeItem("google_id_token");
        onTokenExpired();
      }
    }
  }, [onLoginSuccess, onTokenExpired]);

  const handleSuccess = (credentialResponse: any) => {
    const token = credentialResponse.credential;
    localStorage.setItem("google_id_token", token);
    onLoginSuccess(token);
  };

  const handleError = () => {
    console.error("Google Login Failed");
  };

  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID || ""}>
      <GoogleLogin onSuccess={handleSuccess} onError={handleError} />
    </GoogleOAuthProvider>
  );
};

export default GoogleLoginButton;