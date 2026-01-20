const KEY_EMAIL = "pw_reset_email";
const KEY_RESET_ID = "pw_reset_id";
const KEY_RESET_TOKEN = "pw_reset_token";

export const PasswordResetStore = {
  setEmail(v: string) {
    sessionStorage.setItem(KEY_EMAIL, v);
  },
  getEmail(): string | null {
    return sessionStorage.getItem(KEY_EMAIL);
  },
  clearEmail() {
    sessionStorage.removeItem(KEY_EMAIL);
  },

  setResetId(v: string) {
    sessionStorage.setItem(KEY_RESET_ID, v);
  },
  getResetId(): string | null {
    return sessionStorage.getItem(KEY_RESET_ID);
  },
  clearResetId() {
    sessionStorage.removeItem(KEY_RESET_ID);
  },

  setResetToken(v: string) {
    sessionStorage.setItem(KEY_RESET_TOKEN, v);
  },
  getResetToken(): string | null {
    return sessionStorage.getItem(KEY_RESET_TOKEN);
  },
  clearResetToken() {
    sessionStorage.removeItem(KEY_RESET_TOKEN);
  },

  clearAll() {
    this.clearEmail();
    this.clearResetId();
    this.clearResetToken();
  },
};
