import {
  ClipboardDocumentListIcon,
  // ArrowPathIcon,
} from "@heroicons/react/24/outline";

import PositionRow from "./components/BanPickSimulation/PositionRow";
import { Input } from "@/components/ui/input";
import ChampionGrid, {
  type ChampionGridProps,
} from "./components/BanPickSimulation/ChampionGrid";
import ReadyCheckModal from "./components/BanPickSimulation/ReadyCheckModal";
import { useBanPickLogic } from "@/hooks/banPick/useBanPickLogic";
import { getBanPickQueryParams } from "@/utils/getQueryParams";
import BanPickTimer from "./components/BanPickSimulation/BanPickTimer";
import { useState } from "react";
import { PHASE } from "@constants/banPick";
import { useChampions } from "@/hooks/banPick/useChampions";
import BanArea from "./components/BanPickSimulation/BanArea";
import PickColumn from "./components/BanPickSimulation/PickColumn";
import CommitButton from "./components/BanPickSimulation/CommitButton";
import NextSetModal from "./components/BanPickSimulation/NextSetModal";
import HistoryModal from "./components/BanPickSimulation/HistoryModal";
import { positions, positionMap, type Position } from "@constants/positions";

const BanPickSimulation = () => {
  const { matchId, teamName, oppositeTeam, mode, initialTeam } =
    getBanPickQueryParams();

  const { champions, version } = useChampions();

  const {
    isModalOpen,
    isReady,
    teams,
    currentSet,
    currentStep,
    startedAt,
    handleReady,
    localBan,
    localPick,
    setLocalBan,
    setLocalPick,
    enemyBan,
    enemyPick,
    currentSetSelections,
    previousPicks,
    isNextSetPreparing,
  } = useBanPickLogic({
    matchId,
    teamName,
    oppositeTeam,
    mode,
    initialTeam,
  });

  const checkTeam = () => {
    if (teams?.blue === teamName) return "blue";
    else if (teams?.red === teamName) return "red";
  };

  const convertTypeToKo = (type: string) => {
    if (type === "pick") return "선택 완료";
    else if (type === "ban") return "챔피언 금지";
    else if (type === "swap") return "스왑해주세요";
    else return "대기 중";
  };

  const myTeam = checkTeam();

  const isSwapPhase = PHASE[currentStep]?.type === "swap";
  const isGameEnd = currentStep === 21;

  const isMyTurn =
    !isSwapPhase &&
    (PHASE[currentStep]?.team === myTeam ||
      PHASE[currentStep]?.team === "both");

  let actionText = "상대 차례입니다";

  if (currentSet === 5 && currentStep === 21) {
    actionText =
      "5세트까지 진행되었습니다.\n기록판을 참고해 전략을 세워보세요!";
  } else if (currentStep === 21) {
    actionText = "다음 게임 시작하기";
  } else if (isSwapPhase) {
    actionText = convertTypeToKo("swap");
  } else if (isMyTurn) {
    actionText = convertTypeToKo(PHASE[currentStep]?.type);
  }

  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const [selectedPosition, setSelectedPosition] = useState<Position | null>(
    null
  );
  const [searchTerm, setSearchTerm] = useState("");

  const filteredByPosition = selectedPosition
    ? champions.filter((champ) => positionMap[selectedPosition].has(champ.name))
    : champions;

  const filteredBySearch = searchTerm
    ? filteredByPosition.filter((champ) =>
        champ.name.includes(searchTerm.trim())
      )
    : filteredByPosition;

  const championGridProps: ChampionGridProps = {
    searchTerm,
    champions: filteredBySearch,
    version,
    currentStep,
    myTeam,
    localBan,
    localPick,
    setLocalBan,
    setLocalPick,
    currentSetSelections,
    previousPicks,
  };

  return (
    <div className="min-h-screen flex flex-col mt-12">
      <div className="flex flex-col w-full max-w-6xl mx-auto px-4 text-xs md:text-base">
        <div className="flex w-full h-16 rounded-tl-md rounded-tr-md overflow-hidden">
          <div className="flex-1 bg-blue-400 text-white flex items-center justify-start font-bold pl-2">
            {teams ? teams.blue : "팀 정보 불러오는중"}
          </div>
          <div className="w-20 bg-black text-white flex flex-col items-center justify-center font-mono font-semibold text-sm md:text-lg relative">
            {startedAt && (
              <BanPickTimer
                matchId={matchId}
                startedAt={startedAt}
                currentStep={currentStep}
                currentSetSelections={currentSetSelections}
                previousPicks={previousPicks}
                champions={champions}
                teamName={teamName}
                isMyTurn={isMyTurn}
                isSwapPhase={isSwapPhase}
              />
            )}
            <div className="mt-1 flex items-center gap-4">
              <ClipboardDocumentListIcon
                className="w-5 h-5 cursor-pointer hover:text-gray-300"
                onClick={() => setIsHistoryOpen(true)}
              />
              {/* <ArrowPathIcon
                className="w-5 h-5 cursor-pointer hover:text-red-800 text-rose-400"
                onClick={() => alert("🚧 공사 중이에요")}
              /> */}
            </div>
          </div>
          <div className="flex-1 bg-red-400 text-white flex items-center justify-end font-bold pr-2">
            {teams ? teams.red : "팀 정보 불러오는중"}
          </div>
        </div>

        <div className="flex justify-between items-center py-2">
          <BanArea
            myTeam={myTeam}
            localBan={localBan}
            enemyBan={enemyBan}
            version={version}
          />
        </div>

        <div className="max-w-6xl mx-auto mt-4 w-full">
          <div className="hidden md:grid md:grid-cols-4 gap-12 w-full">
            <div className="md:col-span-1 border min-h-92 flex flex-col divide-y">
              <PickColumn
                team="blue"
                picks={myTeam === "blue" ? localPick : enemyPick}
              />
            </div>

            <div className="md:col-span-2 flex flex-col gap-2 px-4">
              <div className="px-4">
                <div className="flex flex-col items-center gap-2 justify-center">
                  <PositionRow
                    selected={selectedPosition}
                    onSelect={setSelectedPosition}
                    positions={positions}
                  />
                  <Input
                    type="text"
                    placeholder="챔피언 검색"
                    className="w-50 rounded-none border border-gray-300 pt-2"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              <div className="h-80 overflow-auto">
                <ChampionGrid {...championGridProps} />
              </div>

              <CommitButton
                disabled={
                  (!isMyTurn && !isGameEnd) ||
                  (currentSet === 5 && currentStep === 21)
                }
                currentStep={currentStep}
                teamName={teamName}
                localPick={localPick}
                localBan={localBan}
                matchId={matchId}
                isGameEnd={isGameEnd}
              >
                {actionText}
              </CommitButton>
            </div>

            <div className="md:col-span-1 border min-h-92 flex flex-col divide-y">
              <PickColumn
                team="red"
                picks={myTeam === "red" ? localPick : enemyPick}
              />
            </div>
          </div>

          <div className="flex flex-col md:hidden gap-4 w-[90%] mx-auto">
            <div className="px-4 flex flex-col items-center">
              <PositionRow
                selected={selectedPosition}
                onSelect={setSelectedPosition}
                positions={positions}
              />
              <Input
                type="text"
                placeholder="챔피언 검색"
                className="w-40 rounded-none border border-gray-300 mt-4"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="min-h-84">
              <div className="h-80 overflow-auto">
                <ChampionGrid {...championGridProps} />
              </div>
            </div>

            <CommitButton
              disabled={
                (!isMyTurn && !isGameEnd) ||
                (currentSet === 5 && currentStep === 21)
              }
              currentStep={currentStep}
              teamName={teamName}
              localPick={localPick}
              localBan={localBan}
              matchId={matchId}
              isGameEnd={isGameEnd}
            >
              {actionText}
            </CommitButton>

            <div className="flex w-[75%] gap-12 mx-auto">
              <div className="flex-1 border border-blue-400 min-h-84 flex flex-col divide-y">
                <PickColumn
                  team="blue"
                  picks={myTeam === "blue" ? localPick : enemyPick}
                />
              </div>

              <div className="flex-1 border border-rose-400 min-h-84 flex flex-col divide-y">
                <PickColumn
                  team="red"
                  picks={myTeam === "red" ? localPick : enemyPick}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <ReadyCheckModal
        open={isModalOpen}
        onReadyClick={handleReady}
        isReady={isReady}
      />

      <NextSetModal
        matchId={matchId}
        open={isNextSetPreparing}
        teamName={teamName}
        oppositeTeam={oppositeTeam}
      />

      <HistoryModal
        matchId={matchId}
        currentSet={currentSet}
        currentStep={currentStep}
        teamName={teamName}
        oppositeTeam={oppositeTeam}
        open={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        version={version}
      />
    </div>
  );
};

export default BanPickSimulation;
