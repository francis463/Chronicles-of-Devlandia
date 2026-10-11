import art from "../assets/menu-backdrop.gif";

/** The pixel-art mountain scene behind the landing page, under a dark wash so the menu stays readable. */
export function MenuBackdrop() {
  return (
    <div aria-hidden="true" data-testid="menu-backdrop" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div
        data-testid="menu-backdrop-art"
        className="absolute inset-0"
        style={{ backgroundImage: `url(${art})`, backgroundSize: "cover", backgroundPosition: "center bottom", imageRendering: "pixelated" }}
      />
      <div className="absolute inset-0 bg-[rgba(15,23,42,0.45)]" />
    </div>
  );
}
