import api from "./axios";

function errMsg(e: any) {
  return e?.response?.data?.message || e?.message || "Request failed";
}

export type MyProfile = {
  userId: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  phoneNumber: string | null;
  address: string | null;
  status?: string;
  hasPassword?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

function mapProfile(x: any): MyProfile {
  return {
    userId: String(x?.userId ?? x?._id ?? ""),
    email: String(x?.email ?? ""),
    fullName: String(x?.fullName ?? ""),
    avatarUrl: x?.avatarUrl ?? null,
    phoneNumber: x?.phoneNumber ?? null,
    address: x?.address ?? null,
    status: x?.status,
    hasPassword: x?.hasPassword,
    createdAt: x?.createdAt,
    updatedAt: x?.updatedAt,
  };
}

export async function getMyProfileApi() {
  try {
    const res = await api.get("/api/users/me");
    return { ok: true, profile: mapProfile(res.data) };
  } catch (e: any) {
    throw new Error(errMsg(e));
  }
}

export async function updateMyProfileApi(input: {
  fullName?: string;
  phoneNumber?: string | null;
  address?: string | null;
}) {
  try {
    const res = await api.patch("/api/users/me", input);
    return { ok: true, profile: mapProfile(res.data) };
  } catch (e: any) {
    throw new Error(errMsg(e));
  }
}

export async function uploadMyAvatarApi(file: File) {
  try {
    const fd = new FormData();
    fd.append("file", file);

    const res = await api.post("/api/users/me/avatar", fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    const profile = mapProfile(res.data);
    return { ok: true, avatarUrl: profile.avatarUrl || "" };
  } catch (e: any) {
    throw new Error(errMsg(e));
  }
}

export async function changeMyPasswordApi(input: {
  currentPassword: string;
  newPassword: string;
}) {
  try {
    await api.post("/api/users/me/change-password", {
      oldPassword: input.currentPassword,
      newPassword: input.newPassword,
    });

    return { ok: true };
  } catch (e: any) {
    throw new Error(errMsg(e));
  }
}

export async function setMyPasswordApi(input: { newPassword: string }) {
  try {
    await api.post("/api/users/me/set-password", { newPassword: input.newPassword });
    return { ok: true };
  } catch (e: any) {
    throw new Error(errMsg(e));
  }
}
