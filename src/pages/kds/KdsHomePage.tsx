import { useAuth } from "../../auth/useAuth";

export default function KdsHomePage() {
  const { user, logout } = useAuth();

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold">KDS Home</h1>
      <p className="mt-2 text-slate-600">Role: {user?.role}</p>

      <button className="mt-4 rounded-xl border px-4 py-2" onClick={logout}>
        Logout
      </button>
    </div>
  );
}
