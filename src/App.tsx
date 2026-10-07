import { useState } from "react";
import { Farewell } from "./screens/Farewell";
import { MainMenu } from "./screens/MainMenu";
import { Overworld } from "./screens/overworld/Overworld";

type Screen = "menu" | "overworld" | "farewell";

export default function App() {
  const [screen, setScreen] = useState<Screen>("menu");
  const [gameId, setGameId] = useState(0);

  const startSoloQuest = () => {
    setGameId((id) => id + 1);
    setScreen("overworld");
  };

  return (
    <main className="min-h-screen p-4 sm:p-8">
      {screen === "menu" && <MainMenu onSoloQuest={startSoloQuest} onExit={() => setScreen("farewell")} />}
      {screen === "overworld" && <Overworld key={gameId} onMenu={() => setScreen("menu")} />}
      {screen === "farewell" && <Farewell onBack={() => setScreen("menu")} />}
    </main>
  );
}
