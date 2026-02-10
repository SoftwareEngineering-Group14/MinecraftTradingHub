// This layout wraps all authenticated routes
// TODO: Add authentication checks here
export default function AuthLayout({ children }) {
  return (
    <div className="auth-layout">
      {children}
    </div>
  );
}
