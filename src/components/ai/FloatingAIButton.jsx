import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Brain, X } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function FloatingAIButton() {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div className="fixed bottom-6 left-6 z-50" dir="rtl">
      <Link to={createPageUrl("SmartAI")}>
        <div
          className="relative group"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {/* Tooltip */}
          {isHovered && (
            <div className="absolute bottom-full left-0 mb-3 bg-slate-900 text-white px-4 py-2 rounded-lg shadow-xl whitespace-nowrap text-sm animate-in fade-in-0 slide-in-from-bottom-2">
              עוזר AI חכם
              <div className="absolute top-full left-6 w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-slate-900"></div>
            </div>
          )}

          {/* Button */}
          <button
            className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 hover:from-purple-600 hover:to-blue-700 shadow-2xl hover:shadow-purple-500/50 transition-all duration-300 flex items-center justify-center group-hover:scale-110 relative overflow-hidden"
          >
            {/* Animated Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-purple-400 to-blue-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            
            {/* Icon */}
            <div className="relative">
              <Brain className="w-8 h-8 text-white animate-pulse" />
            </div>

            {/* Pulse Ring */}
            <div className="absolute inset-0 rounded-full border-2 border-purple-300 animate-ping opacity-75"></div>
          </button>

          {/* Glow Effect */}
          <div className="absolute inset-0 rounded-full bg-purple-500 blur-xl opacity-50 group-hover:opacity-75 transition-opacity -z-10"></div>
        </div>
      </Link>
    </div>
  );
}