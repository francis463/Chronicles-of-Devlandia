import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { HIDDEN_ARTIFACT } from "../../game/constants";
import type { Card } from "../../game/cards";
import type { Poi, PoiId, Point } from "../../game/types";
import type { ZoneId } from "../../game/zones";
import type { Teammate } from "../../hooks/useTeamSession";
import type { SceneInput } from "../../render/scene";
import { spriteBox, type SpriteId } from "../../render/sprites";
import { VILLAGE_POINTS } from "../../render/areas/village";
import { LANDMARK_POINTS } from "../../render/terrain";
import { fitWorld, toArt, type ViewSize, type WorldRect } from "../../render/world";
import { Button } from "../../ui/Button";
import { Panel } from "../../ui/Panel";
import { EXPLORER_BOX, SEMICOLON_BOX, labelBoxes, labelLayout, teammateLabelSide, LABEL_GAP, type LabelPlacement } from "./labelLayout";
import { MapCanvas } from "./MapCanvas";
import { EXIT_SIGNS, captionRect, exitSignBox, hitArea, landmarkCaptions, mapCaptionRect, promptRect, type MapCaptionId } from "./mapLayout";

const SOLO_COLOR = "#22c55e";
const at = (p: Point) => ({ left: `${p.x}%`, top: `${p.y}%` });
const currentDpr = () => window.devicePixelRatio || 1;

/**
 * The map area's CSS size and the device pixel ratio. Updates on resize and on DPR changes (zoom,
 * moving to another screen); falls back to 600 × 360 where ResizeObserver is missing.
 */
function useMapSize() {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<ViewSize>(() => ({ width: 600, height: 360, dpr: currentDpr() }));
  useLayoutEffect(() => {
    const el = ref.current;
    const canMeasure = !!el && typeof ResizeObserver !== "undefined";
    const update = () =>
      setSize((prev) => {
        const next = {
          width: canMeasure ? el!.clientWidth : prev.width,
          height: canMeasure ? el!.clientHeight : prev.height,
          dpr: currentDpr(),
        };
        return next.width === prev.width && next.height === prev.height && next.dpr === prev.dpr ? prev : next;
      });
    update();
    const observer = canMeasure ? new ResizeObserver(update) : null;
    if (observer && el) observer.observe(el);
    window.addEventListener("resize", update);
    // A DPR change alone doesn't resize the element: watch the current resolution and re-arm.
    let query: MediaQueryList | null = null;
    const onDpr = () => {
      update();
      arm();
    };
    const arm = () => {
      query?.removeEventListener("change", onDpr);
      query = typeof window.matchMedia === "function" ? window.matchMedia(`(resolution: ${currentDpr()}dppx)`) : null;
      query?.addEventListener("change", onDpr);
    };
    arm();
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", update);
      query?.removeEventListener("change", onDpr);
    };
  }, []);
  return [ref, size] as const;
}

/** A zero-size anchor at a game point carrying a character's label; sprites are on the canvas. */
function LabelAnchor({
  testId,
  point,
  label,
  labelStyle,
  className,
  duration,
}: {
  testId: string;
  point: Point;
  label: string;
  labelStyle: CSSProperties;
  className: string;
  duration: string;
}) {
  return (
    <div
      data-testid={testId}
      className={`pointer-events-none absolute transition-[left,top] ease-linear motion-reduce:transition-none ${duration}`}
      style={at(point)}
    >
      <span className={`text-outline absolute text-[10px] uppercase tracking-widest whitespace-nowrap ${className}`} style={labelStyle}>
        {label}
      </span>
    </div>
  );
}

/** Where a label goes relative to its anchor, from the box labelLayout computed. */
function labelStyleFor(
  box: { left: number; right: number; top: number; bottom: number },
  placement: LabelPlacement,
  anchor: { x: number; y: number },
): CSSProperties {
  const midX = (box.left + box.right) / 2 - anchor.x;
  const midY = (box.top + box.bottom) / 2 - anchor.y;
  if (placement.side === "right") return { left: box.left - anchor.x, top: midY, transform: "translateY(-50%)" };
  if (placement.side === "left") return { right: anchor.x - box.right, top: midY, transform: "translateY(-50%)" };
  return { left: midX, top: box.top - anchor.y, transform: "translateX(-50%)" };
}

function LandmarkButton({
  sprite,
  point,
  name,
  color,
  world,
  map,
  prefer,
  disabled,
  hideCaption,
  onClick,
}: {
  sprite: SpriteId;
  point: { x: number; y: number };
  name: string;
  color: string;
  world: WorldRect;
  map: { width: number; height: number };
  prefer: "above" | "below";
  disabled: boolean;
  /** While you can use this landmark the prompt names it, and its caption would cover your explorer. */
  hideCaption: boolean;
  onClick: () => void;
}) {
  const hit = hitArea(spriteBox(sprite, point), world);
  const caption = captionRect(name, hit, map, prefer);
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="absolute cursor-pointer rounded-sm bg-transparent hover:shadow-[0_0_0_4px_#f8fafc] hover:outline-2 hover:outline-[#0f172a] focus-visible:shadow-[0_0_0_4px_#f8fafc] focus-visible:outline-2 focus-visible:outline-[#0f172a] disabled:cursor-not-allowed disabled:hover:shadow-none disabled:hover:outline-none"
      style={{ left: hit.left - world.left, top: hit.top - world.top, width: hit.width, height: hit.height }}
    >
      <span
        className={`absolute rounded-sm border border-[var(--panel-border)] px-1 py-0.5 text-[10px] font-bold uppercase tracking-widest whitespace-nowrap ${hideCaption ? "opacity-0" : ""}`}
        style={{ left: caption.left - hit.left, top: caption.top - hit.top, background: "rgba(15,23,42,0.8)", color }}
      >
        {name}
      </span>
    </button>
  );
}

function MapCaption({ id, text, world }: { id: MapCaptionId; text: string; world: WorldRect }) {
  const rect = mapCaptionRect(id, text, world);
  return (
    <span
      className="text-outline pointer-events-none absolute text-[10px] uppercase tracking-widest whitespace-nowrap text-[var(--text-muted)]"
      style={{ left: rect.left - world.left, top: rect.top - world.top }}
    >
      {text}
    </span>
  );
}

export function MapViewport({
  zone,
  player,
  drone,
  minutes,
  hasLoot,
  gateUnlocked,
  clueDecoded,
  artifactFound,
  towerPowered,
  teammates = [],
  playerColor,
  inRange,
  downed,
  onInteract,
  onCloseInspection,
  onRespawn,
  prompt: promptText,
  card,
}: {
  zone: ZoneId;
  player: Point;
  drone: Point;
  minutes: number;
  hasLoot: boolean;
  gateUnlocked: boolean;
  clueDecoded: boolean;
  artifactFound: boolean;
  towerPowered: boolean;
  teammates?: Teammate[];
  playerColor?: string;
  inRange: Poi | null;
  downed: boolean;
  onInteract: (poi: PoiId) => void;
  onCloseInspection: () => void;
  onRespawn: () => void;
  /** The [E] prompt for the place in reach (empty when none). */
  prompt: string;
  /** The inspection card, if you inspected something here. */
  card: Card | null;
}) {
  const [mapRef, size] = useMapSize();
  const world = fitWorld(size);
  const map = { width: size.width, height: size.height };
  const worldSize = { width: world.width, height: world.height };
  const inPeaks = zone === "peaks";
  const obstacles = [
    ...(inPeaks && artifactFound ? [{ ...HIDDEN_ARTIFACT, box: SEMICOLON_BOX }] : []),
    ...teammates.map((t) => ({ x: t.x, y: t.y, box: EXPLORER_BOX })),
  ];
  const fixed = [...landmarkCaptions(world, map, { hasLoot, towerPowered }, zone), exitSignBox(world, zone)];
  const labels = labelLayout(player, drone, worldSize, obstacles, world.scale, fixed);
  const boxes = labelBoxes(player, drone, worldSize, labels, world.scale);
  const inWorld = (p: Point) => ({ x: (p.x / 100) * world.width, y: (p.y / 100) * world.height });

  const exitSign = EXIT_SIGNS[zone];

  const scene: SceneInput = {
    zone,
    player,
    drone,
    teammates,
    playerColor: playerColor ?? SOLO_COLOR,
    downed,
    hasLoot,
    gateUnlocked,
    clueDecoded,
    artifactFound,
    towerPowered,
    minutes,
  };
  const me = toArt(player);
  const fogX = world.left + me.x * world.scale;
  const fogY = world.top + (me.y - 8) * world.scale;
  const prompt = inRange ? promptRect(promptText, me, world, map) : null;
  const P = LANDMARK_POINTS;
  const V = VILLAGE_POINTS;

  return (
    <div ref={mapRef} className="relative min-h-[360px] flex-1 overflow-hidden bg-[var(--panel)]">
      <MapCanvas input={scene} world={world} />

      {/* Crossing into another zone: the new map fades in from the panel colour, under the fog. */}
      <div
        key={`fade:${zone}`}
        data-testid="zone-fade"
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-[5] bg-[var(--panel)] opacity-0 animate-[zone-fade_200ms_ease-out] motion-reduce:hidden"
      />

      {/* Fog of war around the player, as before; the powered signal tower fades it out. */}
      <div
        data-testid="fog"
        className="pointer-events-none absolute inset-0 z-10 transition-opacity duration-1000 ease-linear motion-reduce:transition-none"
        style={{
          background: `radial-gradient(circle farthest-corner at ${fogX}px ${fogY}px, transparent 0%, transparent 15%, rgba(15,23,42,0.35) 32%, rgba(15,23,42,0.7) 62%)`,
          opacity: towerPowered ? 0 : 1,
        }}
      />

      <div
        key={`layer:${zone}`}
        data-testid="world-layer"
        className="absolute z-20 animate-[zone-in_200ms_ease-out] motion-reduce:animate-none"
        style={{ left: `${world.left}px`, top: `${world.top}px`, width: `${world.width}px`, height: `${world.height}px` }}
      >
        {inPeaks ? (
          <>
            <MapCaption id="peaks" text="(Snowy Peaks Biome)" world={world} />
            <MapCaption id="river" text={towerPowered ? "Bridge" : "Frozen River"} world={world} />
            <MapCaption id="forest" text="(Dense Forests Biome)" world={world} />

            <LandmarkButton sprite="tower" point={P.tower} name={towerPowered ? "[T] Tower ✓" : "[T] Tower"} color="var(--primary-border)" world={world} map={map} prefer="above" disabled={downed} hideCaption={inRange?.id === "tower"} onClick={() => onInteract("tower")} />
            <LandmarkButton sprite={hasLoot ? "chest-open" : "chest-closed"} point={P.chest} name={hasLoot ? "[X] Empty Cache" : "[X] Supply Cache"} color="var(--accent)" world={world} map={map} prefer="above" disabled={downed} hideCaption={inRange?.id === "chest"} onClick={() => onInteract("chest")} />
            <LandmarkButton sprite="gate" point={P.gate} name="[G] Gate" color="var(--accent)" world={world} map={map} prefer="below" disabled={downed} hideCaption={inRange?.id === "gate"} onClick={() => onInteract("gate")} />
          </>
        ) : (
          <>
            <MapCaption id="village" text="(Dev Village)" world={world} />

            <LandmarkButton sprite="explorer-down" point={V.villager} name="[V] Ada" color="var(--accent-border)" world={world} map={map} prefer="above" disabled={downed} hideCaption={inRange?.id === "villager"} onClick={() => onInteract("villager")} />
            <LandmarkButton sprite="signpost" point={V.signpost} name="[P] Signpost" color="var(--text)" world={world} map={map} prefer="above" disabled={downed} hideCaption={inRange?.id === "signpost"} onClick={() => onInteract("signpost")} />
          </>
        )}
        <MapCaption id={exitSign.id} text={exitSign.text} world={world} />

        {inPeaks && clueDecoded && !artifactFound && (
          <div data-testid="dig-spot" className="pointer-events-none absolute" style={at(HIDDEN_ARTIFACT)}>
            <span className="sr-only">Dig spot</span>
          </div>
        )}
        {inPeaks && artifactFound && (
          <div data-testid="artifact" title="Golden Semicolon" className="pointer-events-none absolute" style={at(HIDDEN_ARTIFACT)}>
            <span className="sr-only">Golden Semicolon</span>
          </div>
        )}

        {teammates.map((t) => {
          const side = teammateLabelSide(t.x);
          const offset = EXPLORER_BOX.right * world.scale + LABEL_GAP;
          const top = ((EXPLORER_BOX.top + EXPLORER_BOX.bottom) / 2) * world.scale;
          return (
            <LabelAnchor
              key={t.id}
              testId={`teammate-${t.name}`}
              point={t}
              label={t.name}
              duration="duration-[250ms]"
              className=""
              labelStyle={{ ...(side === "right" ? { left: offset } : { right: offset }), top, transform: "translateY(-50%)", color: t.color }}
            />
          );
        })}
        <LabelAnchor
          testId="drone"
          point={drone}
          label="[AI Drone]"
          duration="duration-300"
          className="text-[var(--primary-border)]"
          labelStyle={labelStyleFor(boxes.droneLabel, labels.drone, inWorld(drone))}
        />
        <LabelAnchor
          testId="player"
          point={player}
          label="[Player]"
          duration="duration-150"
          className="text-[var(--text)]"
          labelStyle={labelStyleFor(boxes.playerLabel, labels.player, inWorld(player))}
        />
      </div>

      {inRange && prompt && (
        <div
          className="pointer-events-none absolute z-40 rounded border border-[var(--accent)] bg-[var(--bg)] px-2 py-1 text-[10px] font-bold uppercase tracking-widest whitespace-nowrap text-[var(--accent)]"
          style={{
            left: prompt.left + prompt.width / 2,
            top: prompt.below ? prompt.top : prompt.top + prompt.height,
            transform: prompt.below ? "translateX(-50%)" : "translate(-50%, -100%)",
          }}
        >
          {promptText}
        </div>
      )}

      {card && (
        <section
          aria-label="POI Inspection"
          className={`absolute left-3 z-40 w-60 max-w-[calc(100%-1.5rem)] ${card.y > 50 ? "top-3" : "bottom-3"}`}
        >
          <Panel label="POI Inspection" className="p-3 shadow-lg">
            <div className="flex flex-col gap-2">
              <span className="text-[10px] font-bold uppercase tracking-widest">{card.title}</span>
              <p className="text-xs text-[var(--text-muted)]">{card.text}</p>
              <Button variant="ghost" disabled={downed} className="py-1" onClick={onCloseInspection}>
                [X] Close
              </Button>
            </div>
          </Panel>
        </section>
      )}

      {downed && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-[rgba(15,23,42,0.85)]">
          <span className="text-lg font-bold tracking-widest text-[var(--danger-border)]">DOWNED</span>
          <Button variant="danger" autoFocus onClick={onRespawn}>
            [ Respawn ]
          </Button>
        </div>
      )}
    </div>
  );
}
