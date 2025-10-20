"use client"

import React from 'react';
import { getPasswordStrengthColor, getPasswordStrengthText, PasswordStrength } from '@/lib/validation';

interface PasswordStrengthIndicatorProps {
  strength: PasswordStrength;
  showFeedback?: boolean;
}

export const PasswordStrengthIndicator: React.FC<PasswordStrengthIndicatorProps> = ({
  strength,
  showFeedback = true
}) => {
  return (
    <div className="space-y-2">
      {/* Strength Bar */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${getPasswordStrengthColor(strength.score)}`}
            style={{ width: `${Math.max(0, Math.min(100, (strength.score / 4) * 100))}%` }}
          />
        </div>
        <span className="text-xs font-medium text-gray-600 min-w-[60px]">
          {getPasswordStrengthText(strength.score)}
        </span>
      </div>

      {/* Requirements Feedback */}
      {showFeedback && strength.feedback.length > 0 && (
        <div className="space-y-1">
          {strength.feedback.map((requirement, index) => (
            <div key={index} className="flex items-center gap-2 text-xs text-gray-600">
              <div className="w-1.5 h-1.5 rounded-full bg-gray-400" />
              <span>{requirement}</span>
            </div>
          ))}
        </div>
      )}

      {/* Success Message */}
      {strength.isValid && (
        <div className="flex items-center gap-2 text-xs text-green-600">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
          <span>Strong password!</span>
        </div>
      )}
    </div>
  );
};
