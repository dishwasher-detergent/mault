export function LandingFooter() {
  return (
    <footer
      className="lp-footer"
      style={{
        borderTop: "1px solid #1a1a1a",
        padding: "2rem 2.5rem",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: "1rem",
      }}
    >
      <span
        style={{
          fontFamily: "var(--font-heading)",
          fontSize: "0.75rem",
          color: "#888",
          letterSpacing: "0.1em",
        }}
      >
        MAGIC VAULT
      </span>

      <div
        className="lp-footer-right"
        style={{ display: "flex", gap: "1.5rem", alignItems: "center" }}
      >
        <a
          href="https://github.com/dishwasher-detergent/mault"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontFamily: "var(--font-heading)",
            fontSize: "0.65rem",
            color: "#999",
            letterSpacing: "0.1em",
            textDecoration: "none",
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
          style={{
            fontFamily: "var(--font-heading)",
            fontSize: "0.65rem",
            color: "#999",
            letterSpacing: "0.1em",
            textDecoration: "none",
            transition: "color 0.15s",
          }}
          onMouseOver={(e) => (e.currentTarget.style.color = "#fff")}
          onMouseOut={(e) => (e.currentTarget.style.color = "#999")}
        >
          3D MODEL
        </a>
        <span
          style={{
            fontFamily: "var(--font-heading)",
            fontSize: "0.65rem",
            color: "#888",
            letterSpacing: "0.08em",
          }}
        >
          NOT AFFILIATED WITH WIZARDS OF THE COAST
        </span>
      </div>
    </footer>
  );
}
