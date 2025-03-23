import { GoogleOAuthProvider, GoogleLogin } from "@react-oauth/google";

const GoogleLoginButton = ({ onLoginSuccess }: { onLoginSuccess: () => void }) => {
  const handleSuccess = (credentialResponse: any) => {
    const token = credentialResponse.credential;
    localStorage.setItem("google_id_token", token);
    onLoginSuccess();
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