import { useCallback, useEffect, useRef, useState } from "react";
import { maskRude } from "../chat/filter";
import { checkPhoto, shrinkToSquare, type Crop } from "../leaderboard/avatar";
import { parseRows, type LeaderboardStore, type Me, type Row } from "../leaderboard/leaderboard";
import { Button } from "../ui/Button";
import { Panel } from "../ui/Panel";
import { MenuBackdrop } from "./MenuBackdrop";
import { Face } from "../ui/Face";
import { PhotoCrop } from "./PhotoCrop";

type Phase = "loading" | "ready" | "failed";

/** The top players by badges, with your own standing and a switch to hide yourself. Anyone can open it. */
export function Leaderboard({
  store,
  signedIn,
  myName,
  onBack,
  shrink = shrinkToSquare,
}: {
  store: LeaderboardStore;
  signedIn: boolean;
  myName: string | null;
  onBack: () => void;
  /** Test seam: turns the chosen file into the small square that is saved. */
  shrink?: (file: File, crop?: Crop) => Promise<Blob>;
}) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [rows, setRows] = useState<Row[]>([]);
  const [me, setMe] = useState<Me | null>(null);
  const [saveFailed, setSaveFailed] = useState(false);
  const [photoMsg, setPhotoMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [picked, setPicked] = useState<File | null>(null);
  const picker = useRef<HTMLInputElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  // Only the newest request may change the screen; an older reply arriving late is ignored.
  const latest = useRef(0);

  const load = useCallback(
    async (showLoading: boolean) => {
      const mine = ++latest.current;
      if (showLoading) setPhase("loading");
      try {
        const [top, standing] = await Promise.all([store.top(), signedIn ? store.me() : Promise.resolve(null)]);
        if (mine !== latest.current) return;
        // Whatever a store hands over is checked once more here, so one odd row can never break the screen.
        setRows(parseRows(top));
        setMe(standing);
        setPhase("ready");
      } catch {
        if (mine === latest.current) setPhase("failed");
      }
    },
    [store, signedIn],
  );

  useEffect(() => {
    void load(true);
    return () => void latest.current++;
  }, [load]);
  useEffect(() => heading.current?.focus(), []);

  const toggle = async () => {
    if (!me) return;
    const next = !me.hidden;
    setSaveFailed(false);
    setMe({ ...me, hidden: next });
    try {
      await store.setHidden(next);
      void load(false);
    } catch {
      setMe(me);
      setSaveFailed(true);
    }
  };

  /** A chosen file is checked, then shown in the crop window; nothing is saved until Save there. */
  const choosePhoto = (file: File | undefined) => {
    if (!file) return;
    const why = checkPhoto(file);
    setPhotoMsg(why);
    if (!why) setPicked(file);
  };
  const savePhoto = async (file: File, crop: Crop) => {
    setPicked(null);
    setBusy(true);
    try {
      await store.setAvatar(await shrink(file, crop));
      await load(false);
    } catch {
      setPhotoMsg("Couldn't save your photo. Try again.");
    } finally {
      setBusy(false);
    }
  };
  const removePhoto = async () => {
    setPhotoMsg(null);
    setBusy(true);
    try {
      await store.removeAvatar();
      await load(false);
    } catch {
      setPhotoMsg("Couldn't remove your photo. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const isMe = (name: string) => !!myName && name.toLowerCase() === myName.toLowerCase();
  const standing = me && me.rank !== null ? `Your rank: ${me.rank} · ${me.badges}/11 badges` : null;

  return (
    <>
      <MenuBackdrop />
      <Panel className="mx-auto flex w-full max-w-xl flex-col items-center gap-4 px-4 py-8 sm:px-6">
        <h1 ref={heading} tabIndex={-1} className="text-center text-lg font-bold tracking-widest text-[var(--text)] outline-none sm:text-xl">
          LEADERBOARD
        </h1>

        {phase === "loading" && <p role="status" className="text-sm text-[var(--text-muted)]">Loading the leaderboard…</p>}
        {phase === "failed" && <p role="alert" className="text-sm text-[var(--danger-border)]">Can't reach the leaderboard.</p>}

        {phase === "ready" && rows.length === 0 && <p className="text-sm text-[var(--text-muted)]">No badges yet. Be the first!</p>}
        {phase === "ready" && rows.length > 0 && (
          <ol aria-label="Top players" className="flex w-full flex-col gap-1">
            {rows.map((r) => (
              <li
                key={`${r.rank}-${r.name}`}
                className={`flex items-center gap-3 rounded border px-3 py-2 text-sm ${isMe(r.name) ? "border-[var(--primary-border)] bg-[var(--bg)]" : "border-[var(--panel-border)]"}`}
              >
                <span className="w-8 shrink-0 text-right font-bold text-[var(--accent)]">{r.rank}</span>
                <Face name={maskRude(r.name)} avatar={r.avatar} />
                <span className="min-w-0 flex-1 truncate">{`${maskRude(r.name)}${isMe(r.name) ? " (you)" : ""}`}</span>
                <span className="shrink-0 text-xs text-[var(--text-muted)]">{`${r.badges}/11 badges`}</span>
              </li>
            ))}
          </ol>
        )}

        {phase === "ready" && signedIn && me && (
          <div className="flex w-full flex-col items-center gap-2 text-sm">
            {me.rank === null && <p>Earn a badge to join the leaderboard.</p>}
            {standing && me.hidden && <p>{`You're hidden. ${standing}.`}</p>}
            {standing && !me.hidden && !rows.some((r) => isMe(r.name)) && <p>{standing}</p>}
            <label className="flex cursor-pointer items-center gap-2 pointer-coarse:min-h-11">
              <input type="checkbox" role="switch" checked={me.hidden} onChange={() => void toggle()} className="h-4 w-4 cursor-pointer" />
              <span>Hide me from the leaderboard</span>
            </label>
            {saveFailed && <p role="alert" className="text-[var(--danger-border)]">Couldn't save that. Try again.</p>}
            <div className="flex flex-wrap items-center justify-center gap-2">
              <input ref={picker} type="file" accept="image/*" aria-label="Choose a photo" className="hidden" onChange={(e) => { choosePhoto(e.target.files?.[0]); e.target.value = ""; }} />
              <Button variant="neutral" disabled={busy} onClick={() => picker.current?.click()}>
                [ Change photo ]
              </Button>
              {me.avatar && (
                <Button variant="ghost" disabled={busy} onClick={() => void removePhoto()}>
                  [ Remove photo ]
                </Button>
              )}
            </div>
            {photoMsg && <p role="alert" className="text-[var(--danger-border)]">{photoMsg}</p>}
          </div>
        )}

        <div className="flex w-full max-w-xs flex-col gap-2">
          <Button variant="neutral" onClick={() => void load(true)} className="w-full">
            [ Refresh ]
          </Button>
          <Button variant="ghost" onClick={onBack} className="w-full">
            [ Back ]
          </Button>
        </div>
      </Panel>
      {picked && <PhotoCrop file={picked} onSave={(crop) => void savePhoto(picked, crop)} onCancel={() => setPicked(null)} />}
    </>
  );
}
