import { Link } from "react-router-dom";

interface LandingCtaProps {
  isSignedIn: boolean;
}

export function LandingCta({ isSignedIn }: LandingCtaProps) {
  return (
    <section
      className="lp-cta"
      style={{
        background: "#7C3AED",
        padding: "6rem 2.5rem",
        textAlign: "center",
      }}
    >
      <h2
        style={{
          fontFamily: "var(--font-heading)",
          fontSize: "clamp(2.5rem, 8vw, 6rem)",
          fontWeight: 800,
          letterSpacing: "-0.03em",
          color: "#fff",
          lineHeight: 0.95,
          marginBottom: "1.5rem",
        }}
      >
        READY TO
        <br />
        START SORTING?
      </h2>
      <p
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: "1.05rem",
          color: "#fff",
          marginBottom: "2.5rem",
          lineHeight: 1.6,
        }}
      >
        Create a free account and connect your hardware.
      </p>
      <Link
        to={isSignedIn ? "/app" : "/auth/sign-up"}
        style={{
          background: "#fff",
          color: "#7C3AED",
          textDecoration: "none",
          fontFamily: "var(--font-heading)",
          fontWeight: 800,
          fontSize: "0.9rem",
          letterSpacing: "0.12em",
          padding: "1.1rem 3rem",
          borderRadius: "0.4rem",
          display: "inline-block",
          transition: "background 0.15s, transform 0.1s",
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.background = "#EDE9FE";
          e.currentTarget.style.transform = "translateY(-2px)";
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.background = "#fff";
          e.currentTarget.style.transform = "translateY(0)";
        }}
      >
        {isSignedIn ? "GO TO APP" : "CREATE ACCOUNT"}
      </Link>
    </section>
  );
}
