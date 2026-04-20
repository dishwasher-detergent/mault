const stats = [
  { value: "7", label: "Sort Bins" },
  { value: "13", label: "Rule Operators" },
  { value: "8", label: "Card Fields" },
  { value: "768", label: "Vector Dimensions" },
];

export function LandingStats() {
  return (
    <div
      style={{
        borderTop: "1px solid #1a1a1a",
        borderBottom: "1px solid #1a1a1a",
        background: "#0f0f0f",
        display: "flex",
        justifyContent: "center",
        flexWrap: "wrap",
      }}
    >
      {stats.map((stat, i) => (
        <div
          key={i}
          className="lp-stats-item"
          style={{
            padding: "2.5rem 4rem",
            textAlign: "center",
            borderRight: i < stats.length - 1 ? "1px solid #1a1a1a" : "none",
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: "2.5rem",
              fontWeight: 800,
              color: "#7C3AED",
              lineHeight: 1,
            }}
          >
            {stat.value}
          </div>
          <div
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: "0.65rem",
              letterSpacing: "0.15em",
              color: "#999",
              marginTop: "0.4rem",
            }}
          >
            {stat.label.toUpperCase()}
          </div>
        </div>
      ))}
    </div>
  );
}
