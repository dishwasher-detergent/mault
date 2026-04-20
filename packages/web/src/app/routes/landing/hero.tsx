import { Link } from "react-router-dom";

interface LandingHeroProps {
  isSignedIn: boolean;
  onSignOut: () => void;
}

export function LandingHero({ isSignedIn, onSignOut }: LandingHeroProps) {
  return (
    <section
      className="lp-hero"
      style={{
        padding: "6rem 2.5rem 5rem",
        maxWidth: "1200px",
        margin: "0 auto",
      }}
    >
      <div
        style={{
          display: "inline-block",
          background: "#7C3AED",
          color: "#fff",
          fontFamily: "var(--font-heading)",
          fontSize: "0.7rem",
          letterSpacing: "0.18em",
          padding: "0.35rem 0.9rem",
          borderRadius: "2rem",
          marginBottom: "2rem",
          fontWeight: 600,
        }}
      >
        OPEN SOURCE · MTG SORTER
      </div>

      <h1
        style={{
          fontFamily: "var(--font-heading)",
          fontSize: "clamp(3rem, 10vw, 8rem)",
          fontWeight: 800,
          lineHeight: 0.92,
          letterSpacing: "-0.03em",
          margin: "0 0 1.5rem",
          color: "#f5f5f5",
        }}
      >
        SORT YOUR
        <br />
        <span style={{ color: "#7C3AED" }}>COLLECTION</span>
        <br />
        AT THE SPEED
        <br />
        OF SIGHT.
      </h1>

      <p
        style={{
          fontSize: "1.05rem",
          color: "#999",
          maxWidth: "520px",
          lineHeight: 1.65,
          marginBottom: "2.5rem",
          fontFamily: "var(--font-sans)",
        }}
      >
        Point a webcam at your cards. Machine learning identifies each one in
        milliseconds. A physical servo controller routes them into labeled
        bins — automatically.
      </p>

      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
        {isSignedIn ? (
          <>
            <Link
              to="/app"
              style={{
                background: "#7C3AED",
                color: "#fff",
                textDecoration: "none",
                fontFamily: "var(--font-heading)",
                fontWeight: 700,
                fontSize: "0.85rem",
                letterSpacing: "0.1em",
                padding: "1rem 2.25rem",
                borderRadius: "0.4rem",
                transition: "background 0.15s, transform 0.1s",
                display: "inline-block",
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = "#6D28D9";
                e.currentTarget.style.transform = "translateY(-1px)";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = "#7C3AED";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              GO TO APP
            </Link>
            <button
              onClick={onSignOut}
              style={{
                background: "transparent",
                color: "#f5f5f5",
                fontFamily: "var(--font-heading)",
                fontWeight: 700,
                fontSize: "0.85rem",
                letterSpacing: "0.1em",
                padding: "1rem 2.25rem",
                borderRadius: "0.4rem",
                border: "1.5px solid #333",
                cursor: "pointer",
                transition: "border-color 0.15s, transform 0.1s",
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.borderColor = "#555";
                e.currentTarget.style.transform = "translateY(-1px)";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.borderColor = "#333";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              SIGN OUT
            </button>
          </>
        ) : (
          <>
            <Link
              to="/auth/sign-up"
              style={{
                background: "#7C3AED",
                color: "#fff",
                textDecoration: "none",
                fontFamily: "var(--font-heading)",
                fontWeight: 700,
                fontSize: "0.85rem",
                letterSpacing: "0.1em",
                padding: "1rem 2.25rem",
                borderRadius: "0.4rem",
                transition: "background 0.15s, transform 0.1s",
                display: "inline-block",
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = "#6D28D9";
                e.currentTarget.style.transform = "translateY(-1px)";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = "#7C3AED";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              START SORTING
            </Link>
            <Link
              to="/auth/sign-in"
              style={{
                background: "transparent",
                color: "#f5f5f5",
                textDecoration: "none",
                fontFamily: "var(--font-heading)",
                fontWeight: 700,
                fontSize: "0.85rem",
                letterSpacing: "0.1em",
                padding: "1rem 2.25rem",
                borderRadius: "0.4rem",
                border: "1.5px solid #333",
                transition: "border-color 0.15s, transform 0.1s",
                display: "inline-block",
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.borderColor = "#555";
                e.currentTarget.style.transform = "translateY(-1px)";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.borderColor = "#333";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              SIGN IN
            </Link>
          </>
        )}
      </div>
    </section>
  );
}
