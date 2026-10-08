import { useState } from 'react';
import { EyeIcon, EyeOffIcon } from './Icons';

interface Props {
  value: string;
  onChange: (value: string) => void;
  /** Browser hint: 'current-password' when signing in, 'new-password' when registering. */
  autoComplete: 'current-password' | 'new-password';
  id?: string;
  invalid?: boolean;
  autoFocus?: boolean;
  required?: boolean;
}

export default function PasswordInput({
  value,
  onChange,
  autoComplete,
  id,
  invalid,
  autoFocus,
  required,
}: Props) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="pw">
      <input
        id={id}
        className={`input${invalid ? ' field-error' : ''}`}
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        autoFocus={autoFocus}
        required={required}
      />
      <button
        type="button"
        className="pw-toggle"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Hide password' : 'Show password'}
        aria-pressed={visible}
        // Keeps the field focused so toggling never submits or blurs the form.
        tabIndex={-1}
      >
        {visible ? <EyeOffIcon /> : <EyeIcon />}
      </button>
    </div>
  );
}
