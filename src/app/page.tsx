import MazeMuralGrid from "./MazeMuralGrid";

export default function Home() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minHeight: "100vh", background: "#111" }}>
      <MazeMuralGrid />
    </div>
  );
}
