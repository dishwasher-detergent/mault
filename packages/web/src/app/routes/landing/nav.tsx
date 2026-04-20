import { Link } from "react-router-dom";

interface LandingNavProps {
  isSignedIn: boolean;
  onSignOut: () => void;
}

export function LandingNav({ isSignedIn, onSignOut }: LandingNavProps) {
  return (
    <nav
      className="lp-nav"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "1.5rem 2.5rem",
        borderBottom: "1px solid #222",
      }}
    >
      <span
        style={{
          fontFamily: "var(--font-heading)",
          fontWeight: 700,
          fontSize: "1rem",
          letterSpacing: "0.12em",
          color: "#A78BFA",
        }}
      >
        MAGIC VAULT
      </span>

      <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
        <a
          href="https://github.com/dishwasher-detergent/mault"
          target="_blank"
          rel="noopener noreferrer"
          className="lp-nav-external"
          style={{
            color: "#999",
            textDecoration: "none",
            fontSize: "0.8rem",
            fontFamily: "var(--font-heading)",
            letterSpacing: "0.08em",
            transition: "color 0.15s",
          }}
          onMouseOver={(e) => (e.currentTarget.style.color = "#fff")}
          onMouseOut={(e) => (e.currentTarget.style.color = "#999")}
        >
          GITHUB
        </a>
        <a
          href="https://makerworld.com/en/models/2484318-horizontal-card-divider-for-storage-box#profileId-2728971"
          target="_blank"
          rel="noopener noreferrer"
          className="lp-nav-external"
          style={{
            color: "#999",
            textDecoration: "none",
            fontSize: "0.8rem",
            fontFamily: "var(--font-heading)",
            letterSpacing: "0.08em",
            transition: "color 0.15s",
          }}
          onMouseOver={(e) => (e.currentTarget.style.color = "#fff")}
          onMouseOut={(e) => (e.currentTarget.style.color = "#999")}
        >
          3D MODEL
        </a>
        <div
          className="lp-nav-divider"
          style={{ width: "1px", height: "1rem", background: "#2a2a2a" }}
        />

        {isSignedIn ? (
          <>
            <button
              onClick={onSignOut}
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                color: "#aaa",
                fontSize: "0.8rem",
                fontFamily: "var(--font-heading)",
                letterSpacing: "0.08em",
                padding: 0,
                transition: "color 0.15s",
              }}
              onMouseOver={(e) => (e.currentTarget.style.color = "#fff")}
              onMouseOut={(e) => (e.currentTarget.style.color = "#aaa")}
            >
              SIGN OUT
            </button>
            <Link
              to="/app"
              style={{
                background: "#7C3AED",
                color: "#fff",
                textDecoration: "none",
                fontSize: "0.8rem",
                fontFamily: "var(--font-heading)",
                letterSpacing: "0.08em",
                padding: "0.5rem 1.25rem",
                borderRadius: "0.3rem",
                transition: "background 0.15s",
              }}
              onMouseOver={(e) => (e.currentTarget.style.background = "#6D28D9")}
              onMouseOut={(e) => (e.currentTarget.style.background = "#7C3AED")}
            >
              GO TO APP
            </Link>
          </>
        ) : (
          <>
            <Link
              to="/auth/sign-in"
              style={{
                color: "#aaa",
                textDecoration: "none",
                fontSize: "0.8rem",
                fontFamily: "var(--font-heading)",
                letterSpacing: "0.08em",
                transition: "color 0.15s",
              }}
              onMouseOver={(e) => (e.currentTarget.style.color = "#fff")}
              onMouseOut={(e) => (e.currentTarget.style.color = "#aaa")}
            >
              SIGN IN
            </Link>
            <Link
              to="/auth/sign-up"
              style={{
                background: "#7C3AED",
                color: "#fff",
                textDecoration: "none",
                fontSize: "0.8rem",
                fontFamily: "var(--font-heading)",
                letterSpacing: "0.08em",
                padding: "0.5rem 1.25rem",
                borderRadius: "0.3rem",
                transition: "background 0.15s",
              }}
              onMouseOver={(e) => (e.currentTarget.style.background = "#6D28D9")}
              onMouseOut={(e) => (e.currentTarget.style.background = "#7C3AED")}
            >
              GET STARTED
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
