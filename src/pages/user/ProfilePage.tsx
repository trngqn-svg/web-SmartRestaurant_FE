import { useEffect, useMemo, useRef, useState } from "react";
import { message } from "antd";
import { Camera, Lock, LogOut, Receipt } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";

import { useAuth } from "../../auth/useAuth";
import { cn } from "../../utils/cn";
import {
  changeMyPasswordApi,
  getMyProfileApi,
  updateMyProfileApi,
  uploadMyAvatarApi,
  type MyProfile,
} from "../../api/me.profile";
import { resolveApiUrl } from "../../utils/url";
import { calcPasswordStrength, validateStrongPassword } from "../../utils/password";

function safeTrim(s: string) {
  return (s ?? "").trim();
}

type PwdForm = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

export default function ProfilePage() {
  const nav = useNavigate();
  const { logout } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pwdSaving, setPwdSaving] = useState(false);

  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // profile form (keep your old state)
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState<string>("");
  const [address, setAddress] = useState<string>("");

  // password form (react-hook-form)
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isValid },
  } = useForm<PwdForm>({
    mode: "onChange",
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const newPwdVal = watch("newPassword") || "";
  const strength = useMemo(() => calcPasswordStrength(newPwdVal), [newPwdVal]);

  const fileRef = useRef<HTMLInputElement | null>(null);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const r = await getMyProfileApi();
      const p = r.profile;
      setProfile(p);

      setFullName(p.fullName || "");
      setPhoneNumber(p.phoneNumber || "");
      setAddress(p.address || "");
    } catch (e: any) {
      setErr(e?.message || "Failed to load profile");
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const dirty = useMemo(() => {
    if (!profile) return false;
    return (
      safeTrim(fullName) !== (profile.fullName || "") ||
      safeTrim(phoneNumber) !== (profile.phoneNumber || "") ||
      safeTrim(address) !== (profile.address || "")
    );
  }, [profile, fullName, phoneNumber, address]);

  async function onSaveProfile() {
    if (!profile) return;
    try {
      setSaving(true);
      const r = await updateMyProfileApi({
        fullName: safeTrim(fullName),
        phoneNumber: safeTrim(phoneNumber) ? safeTrim(phoneNumber) : null,
        address: safeTrim(address) ? safeTrim(address) : null,
      });
      setProfile(r.profile);
      message.success("Updated profile");
    } catch (e: any) {
      message.error(e?.message || "Update failed");
    } finally {
      setSaving(false);
    }
  }

  async function onPickAvatar(file?: File | null) {
    if (!file) return;
    try {
      message.loading({ content: "Uploading...", key: "up" });
      const r = await uploadMyAvatarApi(file);
      setProfile((prev) => (prev ? { ...prev, avatarUrl: r.avatarUrl } : prev));
      message.success({ content: "Avatar updated", key: "up" });
    } catch (e: any) {
      message.error({ content: e?.message || "Upload failed", key: "up" });
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const onSubmitPassword = handleSubmit(async (vals) => {
    try {
      setPwdSaving(true);

      await changeMyPasswordApi({
        currentPassword: safeTrim(vals.currentPassword),
        newPassword: safeTrim(vals.newPassword),
      });

      message.success("Password changed");
      reset();
    } catch (e: any) {
      message.error(e?.message || "Change password failed");
    } finally {
      setPwdSaving(false);
    }
  });

  const strengthPct = (strength.score / 4) * 100;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto w-full max-w-5xl px-4 py-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-2xl font-extrabold text-slate-900">Profile</div>
            <div className="text-xs text-slate-500">Manage your personal info and security</div>
          </div>

          <div className="flex items-center gap-2">
            <button
              className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-extrabold text-slate-900 border border-slate-200 hover:bg-slate-50 active:scale-[0.98]"
              onClick={() => nav("/profile/bills")}
            >
              <Receipt className="h-4 w-4" />
              Bills
            </button>

            <button
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-extrabold text-[#E2B13C] hover:bg-slate-800 active:scale-[0.98]"
              onClick={() => {
                logout();
                message.success("Logged out");
              }}
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-12">
          {/* Left */}
          <div className="lg:col-span-5 space-y-4">
            {/* Avatar card */}
            <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
              {loading ? (
                <div className="text-sm text-slate-600">Loading...</div>
              ) : err ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                  {err}
                </div>
              ) : profile ? (
                <div className="flex items-center gap-4">
                  <div className="relative h-20 w-20 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                    {profile.avatarUrl ? (
                      <img
                        src={resolveApiUrl(profile.avatarUrl)}
                        alt="avatar"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full grid place-items-center text-slate-400 font-black">
                        {String(profile.fullName || profile.email || "U")
                          .slice(0, 1)
                          .toUpperCase()}
                      </div>
                    )}

                    <button
                      onClick={() => fileRef.current?.click()}
                      className="absolute bottom-2 right-2 inline-flex h-8 w-8 items-center justify-center rounded-xl bg-white border border-slate-200 shadow-sm hover:bg-slate-50 active:scale-[0.98]"
                      title="Change avatar"
                    >
                      <Camera className="h-4 w-4" />
                    </button>

                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => onPickAvatar(e.target.files?.[0] ?? null)}
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-extrabold text-slate-900 truncate">
                      {profile.fullName || "Unnamed"}
                    </div>
                    <div className="text-xs text-slate-500 truncate">{profile.email}</div>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Personal info */}
            <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="text-sm font-extrabold text-slate-900">Personal information</div>

              <div className="mt-4 grid grid-cols-1 gap-3">
                <div>
                  <div className="text-[11px] font-bold text-slate-500 mb-1">Full name</div>
                  <input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 outline-none focus:border-[#E2B13C] focus:ring-2 focus:ring-[#E2B13C]/20"
                    placeholder="Your name"
                  />
                </div>

                <div>
                  <div className="text-[11px] font-bold text-slate-500 mb-1">Phone number</div>
                  <input
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 outline-none focus:border-[#E2B13C] focus:ring-2 focus:ring-[#E2B13C]/20"
                    placeholder="(optional)"
                  />
                </div>

                <div>
                  <div className="text-[11px] font-bold text-slate-500 mb-1">Address</div>
                  <textarea
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    rows={3}
                    className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 outline-none focus:border-[#E2B13C] focus:ring-2 focus:ring-[#E2B13C]/20"
                    placeholder="(optional)"
                  />
                </div>

                <button
                  disabled={saving || !dirty || !profile}
                  onClick={onSaveProfile}
                  className={cn(
                    "mt-1 w-full rounded-2xl px-4 py-3 text-sm font-extrabold shadow-sm",
                    saving || !dirty || !profile
                      ? "bg-slate-100 text-slate-400"
                      : "bg-slate-900 text-[#E2B13C] hover:bg-slate-800 active:scale-[0.99]"
                  )}
                >
                  {saving ? "Saving..." : "Save changes"}
                </button>
              </div>
            </div>
          </div>

          {/* Right */}
          <div className="lg:col-span-7 space-y-4">
            {/* Security */}
            <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
                <Lock className="h-4 w-4" />
                Security (Change password)
              </div>

              <form onSubmit={onSubmitPassword} className="mt-4 grid grid-cols-1 gap-3">
                {/* current */}
                <div>
                  <div className="text-[11px] font-bold text-slate-500 mb-1">Current password</div>
                  <input
                    type="password"
                    className={cn(
                      "w-full rounded-xl border bg-white px-3 py-2 text-sm font-semibold text-slate-900 outline-none",
                      "focus:border-[#E2B13C] focus:ring-2 focus:ring-[#E2B13C]/20",
                      errors.currentPassword ? "border-rose-300" : "border-slate-200"
                    )}
                    {...register("currentPassword", {
                      required: "Current password is required",
                    })}
                  />
                  {errors.currentPassword ? (
                    <div className="mt-1 text-xs font-semibold text-rose-600">
                      {errors.currentPassword.message}
                    </div>
                  ) : null}
                </div>

                {/* new + confirm */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <div className="text-[11px] font-bold text-slate-500 mb-1">New password</div>
                    <input
                      type="password"
                      className={cn(
                        "w-full rounded-xl border bg-white px-3 py-2 text-sm font-semibold text-slate-900 outline-none",
                        "focus:border-[#E2B13C] focus:ring-2 focus:ring-[#E2B13C]/20",
                        errors.newPassword ? "border-rose-300" : "border-slate-200"
                      )}
                      {...register("newPassword", {
                        validate: validateStrongPassword,
                      })}
                    />
                    {errors.newPassword ? (
                      <div className="mt-1 text-xs font-semibold text-rose-600">
                        {errors.newPassword.message as any}
                      </div>
                    ) : null}

                    {/* strength */}
                    <div className="mt-2">
                      <div className="flex items-center justify-between">
                        <div className="text-[11px] font-bold text-slate-500">Strength</div>
                        <div className="text-[11px] font-extrabold text-slate-700">
                          {strength.label}
                        </div>
                      </div>

                      <div className="mt-1 h-2 w-full rounded-full bg-slate-100 overflow-hidden border border-slate-200">
                        <div
                          className="h-full rounded-full transition-all bg-slate-900"
                          style={{ width: `${strengthPct}%` }}
                        />
                      </div>

                      <div className="mt-2 grid grid-cols-2 gap-1 text-[11px] text-slate-500">
                        <div className={cn(strength.checks.length8 ? "text-slate-900 font-semibold" : "")}>
                          • 8+ chars
                        </div>
                        <div className={cn(strength.checks.upper ? "text-slate-900 font-semibold" : "")}>
                          • Uppercase
                        </div>
                        <div className={cn(strength.checks.lower ? "text-slate-900 font-semibold" : "")}>
                          • Lowercase
                        </div>
                        <div className={cn(strength.checks.number ? "text-slate-900 font-semibold" : "")}>
                          • Number
                        </div>
                        <div className={cn(strength.checks.special ? "text-slate-900 font-semibold" : "")}>
                          • Special
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="text-[11px] font-bold text-slate-500 mb-1">Confirm</div>
                    <input
                      type="password"
                      className={cn(
                        "w-full rounded-xl border bg-white px-3 py-2 text-sm font-semibold text-slate-900 outline-none",
                        "focus:border-[#E2B13C] focus:ring-2 focus:ring-[#E2B13C]/20",
                        errors.confirmPassword ? "border-rose-300" : "border-slate-200"
                      )}
                      {...register("confirmPassword", {
                        required: "Confirm password is required",
                        validate: (v) => v === watch("newPassword") || "Confirm password does not match",
                      })}
                    />
                    {errors.confirmPassword ? (
                      <div className="mt-1 text-xs font-semibold text-rose-600">
                        {errors.confirmPassword.message}
                      </div>
                    ) : null}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={pwdSaving || !isValid}
                  className={cn(
                    "mt-1 w-full rounded-2xl px-4 py-3 text-sm font-extrabold shadow-sm",
                    pwdSaving || !isValid
                      ? "bg-slate-100 text-slate-400"
                      : "bg-slate-900 text-[#E2B13C] hover:bg-slate-800 active:scale-[0.99]"
                  )}
                >
                  {pwdSaving ? "Updating..." : "Change password"}
                </button>

                <div className="text-xs text-slate-500">
                  If you logged in via Google and don’t have a password yet, backend should return an error for change-password.
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
