import React from 'react';
import { AiOutlineLoading3Quarters } from 'react-icons/ai';

const LoadingScreen = () => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-transparent">
      <AiOutlineLoading3Quarters className="w-12 h-12 text-[#6C5CE7] animate-spin" />
    </div>
  );
};

export default LoadingScreen;
