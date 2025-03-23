import './App.css'
import { Chat } from './pages/chat/chat'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext'
import { jwtDecode } from "jwt-decode";
import GoogleLoginButton from "./components/auth/GoogleLogin";
import { useEffect, useState } from "react";

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("google_id_token");

    if (token) {
      try {
        const decodedToken: { exp: number } = jwtDecode(token);

        const currentTime = Math.floor(Date.now() / 1000);
        if (decodedToken.exp > currentTime) {
          console.log("Logged in");
          setIsLoggedIn(true);
        } else {
          localStorage.removeItem("google_id_token");
          console.error("Token expired");
          setIsLoggedIn(false);
        }
      } catch (error) {
        console.error("Invalid token:", error);
        localStorage.removeItem("google_id_token");
        setIsLoggedIn(false);
      }
    }
  }, []);

  const handleLoginSuccess = () => {
    setShowSuccessMessage(true);
    setTimeout(() => {
      setShowSuccessMessage(false);
      setIsLoggedIn(true);
    }, 2000);
  };

  return (
    <ThemeProvider>
      <Router>
        <div className="w-full h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
          {!isLoggedIn && (
            <div className="absolute top-0 left-0 w-full p-4 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-center">
              <GoogleLoginButton onLoginSuccess={handleLoginSuccess} />
            </div>
          )}
          {showSuccessMessage && (
            <div className="absolute top-0 left-0 w-full p-4 bg-green-500 text-white text-center">
              Logged in
            </div>
          )}
          <Routes>
            <Route path="/" element={<Chat />} />
          </Routes>
        </div>
      </Router>
    </ThemeProvider>
  );
}

export default App;