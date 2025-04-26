import MazeMuralGrid from "./MazeMuralGrid";

export default function Home() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minHeight: "100vh", background: "#111" }}>
      <h1 style={{ color: "#fff", margin: "2rem 0" }}>Maze Mosaic</h1>
      <MazeMuralGrid />
    </div>
  );
}
