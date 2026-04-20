const rarities = [
  {
    label: "MYTHIC",
    desc: "Route chase rares to a dedicated bin automatically.",
    color: "oklch(73.235% 0.17251 55.531)",
    bg: "#1a1008",
  },
  {
    label: "RARE",
    desc: "Gold cards for your trade binder, sorted on the fly.",
    color: "oklch(83.828% 0.16176 98.163)",
    bg: "#18170a",
  },
  {
    label: "UNCOMMON",
    desc: "Silver cards neatly separated from the bulk.",
    color: "oklch(78.194% 0.09549 244.199)",
    bg: "#0a1018",
  },
  {
    label: "COMMON",
    desc: "Bulk commons sorted by color, CMC, or set.",
    color: "oklch(60% 0 0)",
    bg: "#111",
  },
];

export function LandingRarity() {
  return (
    <section
      className="lp-section"
      style={{
        padding: "6rem 2.5rem",
        maxWidth: "1200px",
        margin: "0 auto",
      }}
    >
      <p
        style={{
          fontFamily: "var(--font-heading)",
          fontSize: "0.7rem",
          letterSpacing: "0.2em",
          color: "#999",
          marginBottom: "1rem",
        }}
      >
        RULE ENGINE
      </p>
      <h2
        style={{
          fontFamily: "var(--font-heading)",
          fontSize: "clamp(2rem, 5vw, 3.5rem)",
          fontWeight: 800,
          letterSpacing: "-0.02em",
          color: "#f5f5f5",
          marginBottom: "3rem",
          lineHeight: 1.05,
        }}
      >
        BUILD RULES,
        <br />
        NOT SPREADSHEETS.
      </h2>

      <div
        className="lp-rarity-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: "1px",
          background: "#1a1a1a",
          borderRadius: "0.75rem",
          overflow: "hidden",
        }}
      >
        {rarities.map((rarity) => (
          <div
            key={rarity.label}
            style={{
              background: rarity.bg,
              padding: "2rem 1.75rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.75rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <div
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: rarity.color,
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontFamily: "var(--font-heading)",
                  fontSize: "0.75rem",
                  letterSpacing: "0.15em",
                  color: rarity.color,
                  fontWeight: 700,
                }}
              >
                {rarity.label}
              </span>
            </div>
            <p
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "0.85rem",
                color: "#aaa",
                lineHeight: 1.55,
                margin: 0,
              }}
            >
              {rarity.desc}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
