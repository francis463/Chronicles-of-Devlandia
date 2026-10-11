import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { HIDDEN_ARTIFACT } from "../../game/constants";
import type { Card } from "../../game/cards";
import { chestById } from "../../learn/chests";
import type { ChestId } from "../../learn/types";
import type { Poi, PoiId, Point } from "../../game/types";
import type { ZoneId } from "../../game/zones";
import type { ActivePing } from "../../hooks/usePings";
import type { Teammate } from "../../hooks/useTeamSession";
import type { SceneInput } from "../../render/scene";
import { fitWorld, toArt, type ViewSize, type WorldRect } from "../../render/world";
import { Button } from "../../ui/Button";
import { Panel } from "../../ui/Panel";
import { EXPLORER_BOX, SEMICOLON_BOX, labelBoxes, labelLayout, teammateLabelSide, LABEL_GAP, type LabelPlacement } from "./labelLayout";
import { MapCanvas } from "./MapCanvas";
import {
  CHEST_CAPTION_SCALE,
  EXIT_SIGNS,
  LANDMARK_CAPTIONS,
  captionRect,
  captionText,
  exitSignBox,
  landmarkCaptions,
  mapCaptionRect,
  promptRect,
  zoneHitAreas,
  type CssRect,
  type MapCaptionId,
} from "./mapLayout";

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

/** A ping: a ring that grows and fades once a second at a point, with the sender's name above it. Decoration only. */
function PingMarker({ ping }: { ping: ActivePing }) {
  return (
    <div data-testid={`ping-${ping.id}`} aria-hidden="true" className="pointer-events-none absolute" style={at(ping)}>
      <span
        className="absolute h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 animate-[ping-ring_1s_ease-out_infinite] motion-reduce:animate-none"
        style={{ borderColor: ping.color }}
      />
      <span className="text-outline absolute -translate-x-1/2 -translate-y-[26px] text-[10px] uppercase tracking-widest whitespace-nowrap" style={{ color: ping.color }}>
        {ping.name}
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
  hit,
  name,
  label,
  color,
  world,
  map,
  prefer,
  disabled,
  hideCaption,
  peek = false,
  passive = false,
  onClick,
}: {
  /** The button's hit area, in map-area CSS px. */
  hit: CssRect;
  /** The caption chip's text. */
  name: string;
  /** The accessible name, when it isn't the caption (chests, the terminal, the Archive). */
  label?: string;
  color: string;
  world: WorldRect;
  map: { width: number; height: number };
  prefer: "above" | "below";
  disabled: boolean;
  /** While you can use a landmark the prompt names it, and its caption would cover your explorer; on a 1× map chest captions hide. */
  hideCaption: boolean;
  /** A hidden caption still shows while the button is hovered or focused. */
  peek?: boolean;
  /** The caption is information only and never takes taps (a chest's on a 1× map, where it was never laid out against its neighbours). */
  passive?: boolean;
  onClick: () => void;
}) {
  const caption = captionRect(name, hit, map, prefer);
  // A hidden or passive caption takes no taps, so a tap under it reaches the place drawn there; any other showing
  // caption sits above the other buttons, so tapping it opens its own place.
  const chip = hideCaption ? `pointer-events-none opacity-0${peek ? " group-hover:opacity-100 group-focus-visible:opacity-100" : ""}` : passive ? "pointer-events-none" : "z-10";
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-label={label}
      className="group absolute cursor-pointer rounded-sm bg-transparent hover:shadow-[0_0_0_4px_#f8fafc] hover:outline-2 hover:outline-[#0f172a] focus-visible:shadow-[0_0_0_4px_#f8fafc] focus-visible:outline-2 focus-visible:outline-[#0f172a] disabled:cursor-not-allowed disabled:hover:shadow-none disabled:hover:outline-none"
      style={{ left: hit.left - world.left, top: hit.top - world.top, width: hit.width, height: hit.height }}
    >
      <span
        className={`absolute rounded-sm border border-[var(--panel-border)] px-1 py-0.5 text-[10px] font-bold uppercase tracking-widest whitespace-nowrap ${chip}`}
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
  badges,
  matcherSolved,
  archiveOpen,
  teammates = [],
  pings = [],
  lightMode,
  snow,
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
  /** The chests you have opened: they draw open. */
  badges: ChestId[];
  matcherSolved: boolean;
  archiveOpen: boolean;
  teammates?: Teammate[];
  /** Team signals in any zone; only this zone's are drawn. */
  pings?: ActivePing[];
  /** Your own view only: lighting override and snowfall (`/light`, `/weather`). */
  lightMode?: "auto" | "day" | "night";
  snow?: boolean;
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
  const mapState = { hasLoot, towerPowered, badges, archiveOpen, reach: inRange?.id ?? null };
  const hits = zoneHitAreas(world, zone);
  const fixed = landmarkCaptions(world, map, mapState, zone);
  const labels = labelLayout(player, drone, worldSize, obstacles, world.scale, fixed, [exitSignBox(world, zone)]);
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
    archiveOpen,
    matcherSolved,
    earned: badges,
    minutes,
    lightMode,
    snow,
  };
  const me = toArt(player);
  const fogX = world.left + me.x * world.scale;
  const fogY = world.top + (me.y - 8) * world.scale;
  const prompt = inRange ? promptRect(promptText, me, world, map) : null;
  const smallMap = world.scale < CHEST_CAPTION_SCALE;
  const caption = (id: PoiId) => captionText(LANDMARK_CAPTIONS.find((l) => l.id === id)!, mapState);
  const chests = LANDMARK_CAPTIONS.flatMap((l) => (l.zone === zone && l.chest ? [{ ...l, chest: chestById(l.chest) }] : []));
  const csEarned = badges.includes("chest-cs");

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

            <LandmarkButton hit={hits.tower} name={caption("tower")} color="var(--primary-border)" world={world} map={map} prefer="above" disabled={downed} hideCaption={inRange?.id === "tower"} onClick={() => onInteract("tower")} />
            <LandmarkButton hit={hits.chest} name={caption("chest")} color="var(--accent)" world={world} map={map} prefer="above" disabled={downed} hideCaption={inRange?.id === "chest"} onClick={() => onInteract("chest")} />
            <LandmarkButton hit={hits.gate} name={caption("gate")} color="var(--accent)" world={world} map={map} prefer="below" disabled={downed} hideCaption={inRange?.id === "gate"} onClick={() => onInteract("gate")} />
          </>
        ) : (
          <>
            <MapCaption id="village" text="(Dev Village)" world={world} />

            <LandmarkButton hit={hits.villager} name={caption("villager")} color="var(--accent-border)" world={world} map={map} prefer="above" disabled={downed} hideCaption={inRange?.id === "villager"} onClick={() => onInteract("villager")} />
            <LandmarkButton hit={hits.signpost} name={caption("signpost")} color="var(--text)" world={world} map={map} prefer="above" disabled={downed} hideCaption={inRange?.id === "signpost"} onClick={() => onInteract("signpost")} />
            <LandmarkButton hit={hits.terminal} name={caption("terminal")} label="Syntax Terminal" color="var(--code-chest)" world={world} map={map} prefer="below" disabled={downed} hideCaption={inRange?.id === "terminal"} onClick={() => onInteract("terminal")} />
            <LandmarkButton
              hit={hits.archive}
              name={caption("archive")}
              label={archiveOpen ? `C sharp chest${csEarned ? ", earned" : ""}` : "Archive"}
              color="var(--code-chest)"
              world={world}
              map={map}
              prefer="above"
              disabled={downed}
              hideCaption={inRange?.id === "archive"}
              onClick={() => onInteract("archive")}
            />
          </>
        )}
        {chests.map((l) => {
          const earned = badges.includes(l.chest.id);
          return (
            <LandmarkButton
              key={l.id}
              hit={hits[l.id]}
              name={captionText({ ...l, chest: l.chest.id }, mapState)}
              label={`${l.chest.spoken} chest${earned ? ", earned" : ""}`}
              color="var(--code-chest)"
              world={world}
              map={map}
              prefer={l.prefer}
              disabled={downed}
              hideCaption={smallMap && inRange?.id !== l.id}
              peek
              passive={smallMap}
              onClick={() => onInteract(l.id)}
            />
          );
        })}
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
        {pings.filter((p) => p.zone === zone).map((p) => (
          <PingMarker key={p.id} ping={p} />
        ))}
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
