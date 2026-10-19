import React, { useRef, useEffect } from 'react';

interface OtpInputBoxProps {
  value: string;
  onChange: (value: string) => void;
  onComplete?: (code: string) => void;
  disabled?: boolean;
}

export const OtpInputBox: React.FC<OtpInputBoxProps> = ({
  value,
  onChange,
  onComplete,
  disabled = false
}) => {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Array of 6 characters
  const digits = Array.from({ length: 6 }, (_, i) => value[i] || '');

  useEffect(() => {
    // Focus first input on mount if empty
    if (!value && inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  const handleChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/\D/g, '');
    if (!rawVal) {
      // Emptying this digit
      const newDigits = [...digits];
      newDigits[index] = '';
      const newVal = newDigits.join('').slice(0, 6);
      onChange(newVal);
      return;
    }

    // If user typed/pasted multiple digits
    if (rawVal.length > 1) {
      const pastedDigits = rawVal.slice(0, 6);
      onChange(pastedDigits);
      if (pastedDigits.length === 6 && onComplete) {
        onComplete(pastedDigits);
      }
      const nextFocus = Math.min(pastedDigits.length, 5);
      inputRefs.current[nextFocus]?.focus();
      return;
    }

    // Single digit input
    const newDigits = [...digits];
    newDigits[index] = rawVal[rawVal.length - 1];
    const newVal = newDigits.join('').slice(0, 6);
    onChange(newVal);

    if (newVal.length === 6 && onComplete) {
      onComplete(newVal);
    }

    // Auto-focus next input
    if (index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        // Move to previous and clear
        inputRefs.current[index - 1]?.focus();
        const newDigits = [...digits];
        newDigits[index - 1] = '';
        onChange(newDigits.join(''));
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted) {
      onChange(pasted);
      if (pasted.length === 6 && onComplete) {
        onComplete(pasted);
      }
      const nextFocus = Math.min(pasted.length, 5);
      inputRefs.current[nextFocus]?.focus();
    }
  };

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      gap: '10px',
      margin: '20px 0'
    }}>
      {Array.from({ length: 6 }).map((_, i) => {
        const isFilled = Boolean(digits[i]);
        return (
          <input
            key={i}
            ref={(el) => { inputRefs.current[i] = el; }}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={1}
            disabled={disabled}
            value={digits[i] || ''}
            onChange={(e) => handleChange(i, e)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onPaste={handlePaste}
            onFocus={(e) => e.target.select()}
            style={{
              width: '46px',
              height: '52px',
              textAlign: 'center',
              fontSize: '1.5rem',
              fontWeight: 700,
              fontFamily: "'JetBrains Mono', monospace",
              color: '#0f766e',
              background: isFilled ? '#f0fdfa' : '#ffffff',
              border: isFilled ? '2px solid #0d9488' : '1.5px solid #cbd5e1',
              borderRadius: '10px',
              boxShadow: isFilled ? '0 0 0 3px rgba(13, 148, 136, 0.15)' : 'none',
              outline: 'none',
              transition: 'all 0.18s ease',
              cursor: disabled ? 'not-allowed' : 'text'
            }}
          />
        );
      })}
    </div>
  );
};
