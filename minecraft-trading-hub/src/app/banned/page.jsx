import Link from 'next/link';

export default function BannedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#1a0e06]">
      <div
        style={{
          maxWidth: '480px',
          width: '100%',
          margin: '0 16px',
          background: '#3b1a1a',
          border: '3px solid #7a1c1c',
          borderRadius: '12px',
          padding: '40px 32px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '20px',
          textAlign: 'center',
        }}
      >
        <p style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '10px', color: '#ff6b6b', lineHeight: 2 }}>
          ACCOUNT BANNED
        </p>

        <p style={{ fontFamily: 'Space Mono, monospace', fontSize: '11px', color: '#e0c090', lineHeight: 1.8 }}>
          Your account has been banned from Minecraft Trading Hub.
          If you believe this is a mistake, please contact a moderator.
        </p>

        <Link
          href="/signin"
          style={{
            fontFamily: 'Space Mono, monospace',
            fontSize: '10px',
            color: '#8fca5c',
            textDecoration: 'underline',
            marginTop: '8px',
          }}
        >
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
