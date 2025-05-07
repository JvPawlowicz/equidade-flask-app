
import React from 'react';
import { Button } from "@/components/ui/button";

export function LoginWithReplit() {
  const handleLogin = () => {
    window.location.href = '/auth/replit';
  };

  return (
    <Button 
      onClick={handleLogin}
      className="w-full bg-[#0E1525] hover:bg-[#1C2333] text-white"
    >
      Login with Replit
    </Button>
  );
}

export default LoginWithReplit;
