export type PasswordStrengthLevel = 0 | 1 | 2 | 3 | 4;

export type PasswordStrength = {
  score: PasswordStrengthLevel;
  label: "Very weak" | "Weak" | "Medium" | "Strong" | "Very strong";
  checks: {
    length8: boolean;
    lower: boolean;
    upper: boolean;
    number: boolean;
    special: boolean;
  };
};

export function calcPasswordStrength(pw: string): PasswordStrength {
  const s = pw ?? "";

  const checks = {
    length8: s.length >= 8,
    lower: /[a-z]/.test(s),
    upper: /[A-Z]/.test(s),
    number: /\d/.test(s),
    special: /[^A-Za-z0-9]/.test(s),
  };

  let scoreNum = 0;
  if (checks.length8) scoreNum++;
  if (checks.lower) scoreNum++;
  if (checks.upper) scoreNum++;
  if (checks.number) scoreNum++;
  if (checks.special) scoreNum++;

  const mapped: PasswordStrengthLevel =
    scoreNum <= 1 ? 0 : scoreNum === 2 ? 1 : scoreNum === 3 ? 2 : scoreNum === 4 ? 3 : 4;

  const label =
    mapped === 0
      ? "Very weak"
      : mapped === 1
      ? "Weak"
      : mapped === 2
      ? "Medium"
      : mapped === 3
      ? "Strong"
      : "Very strong";

  return { score: mapped, label, checks };
}

export function validateStrongPassword(pw: string): true | string {
  const s = pw ?? "";
  if (!s) return "New password is required";
  if (s.length < 8) return "Password must be at least 8 characters";
  if (!/[a-z]/.test(s)) return "Must include a lowercase letter";
  if (!/[A-Z]/.test(s)) return "Must include an uppercase letter";
  if (!/\d/.test(s)) return "Must include a number";
  if (!/[^A-Za-z0-9]/.test(s)) return "Must include a special character";
  return true;
}
