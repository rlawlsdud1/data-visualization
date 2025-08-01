import {
  updateDoc,
  getDoc,
  doc,
  serverTimestamp,
  runTransaction,
} from "firebase/firestore";
import { db } from "@/firebase";
import { PHASE } from "@constants/banPick";

export const useBanPickController = (matchId: string) => {
  const docRef = doc(db, "banPickSimulations", matchId);

  const goToNextStep = async (localStep: number) => {
    await runTransaction(db, async (transaction) => {
      const docSnap = await transaction.get(docRef);
      if (!docSnap.exists()) return;

      const data = docSnap.data();
      const currentSet = data.currentSet;
      const firestoreStep = data.sets?.[currentSet]?.currentStep;

      // Firestore에 저장된 단계와 클라이언트가 인식한 단계가 다르면 (이미 다른 곳에서 진행된 경우)
      // 트랜잭션을 취소하고 변경하지 않음.
      if (firestoreStep !== localStep) return;

      transaction.update(docRef, {
        [`sets.${currentSet}.currentStep`]: firestoreStep + 1,
        [`sets.${currentSet}.startedAt`]: serverTimestamp(),
      });
    });
  };

  const setStartedAtIfNeeded = async () => {
    const docSnap = await getDoc(docRef);
    const data = docSnap.data();
    if (!data) return;

    const currentSet = data.currentSet;
    const setData = data.sets?.[currentSet];
    if (!setData || setData.startedAt) return;

    const bothReady =
      setData.started?.blueTeam === "ready" &&
      setData.started?.redTeam === "ready";

    if (bothReady) {
      await updateDoc(docRef, {
        [`sets.${currentSet}.startedAt`]: serverTimestamp(),
      });
    }
  };

  const commitAndAdvance = async (
    teamName: string,
    champName: string,
    type: "ban" | "pick",
    localStep: number
  ) => {
    await runTransaction(db, async (transaction) => {
      const docSnap = await transaction.get(docRef);
      if (!docSnap.exists()) return;

      const data = docSnap.data();
      const currentSet = data.currentSet;
      const setData = data.sets?.[currentSet];
      if (!setData) return;

      const firestoreStep = setData.currentStep;
      if (firestoreStep !== localStep) return;

      const targetPath =
        type === "ban"
          ? `sets.${currentSet}.ban.${teamName}`
          : `sets.${currentSet}.pick.${teamName}`;

      const currentList =
        type === "ban" ? setData.ban[teamName] : setData.pick[teamName];

      const newList = [...currentList];
      newList[PHASE[localStep].index] = champName;

      transaction.update(docRef, {
        [targetPath]: newList,
        [`sets.${currentSet}.currentStep`]: firestoreStep + 1,
        [`sets.${currentSet}.startedAt`]: serverTimestamp(),
      });
    });
  };

  // 모든 밴픽이 끝났을 때 total에 pick을 저장
  const commitTotalPickIfNeeded = async (teamName: string) => {
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return;

    const data = docSnap.data();
    const currentSet = data.currentSet;
    const pickList = data.sets?.[currentSet]?.pick?.[teamName];

    const existingTotal = data.total?.[teamName] || [];

    const isAlreadyCommitted = pickList.every((champ: string) =>
      existingTotal.includes(champ)
    );
    if (isAlreadyCommitted) return;

    const updatedTotal = [...existingTotal, ...pickList];

    await updateDoc(docRef, {
      [`total.${teamName}`]: updatedTotal,
    });
  };

  const toggleIsNextSetPreparing = async (targetValue: boolean) => {
    await runTransaction(db, async (transaction) => {
      const docSnap = await transaction.get(docRef);
      if (!docSnap.exists()) return;

      const current = docSnap.data().isNextSetPreparing;

      if (current === targetValue) return;

      transaction.update(docRef, {
        isNextSetPreparing: targetValue,
      });
    });
  };

  const createNextSet = async (
    side: "blue" | "red",
    teamName: string,
    oppositeTeam: string
  ) => {
    const docRef = doc(db, "banPickSimulations", matchId);

    try {
      await runTransaction(db, async (transaction) => {
        const snap = await transaction.get(docRef);
        const data = snap.data();
        if (!data) return;

        const currentSet = data.currentSet;
        const nextSet = currentSet + 1;

        transaction.update(docRef, {
          [`sets.${nextSet}`]: {
            teams: {
              blue: side === "blue" ? teamName : oppositeTeam,
              red: side === "red" ? teamName : oppositeTeam,
            },
            currentStep: 0,
            started: {
              blueTeam: "pending",
              redTeam: "pending",
            },
            ban: {
              [teamName]: Array(5).fill(""),
              [oppositeTeam]: Array(5).fill(""),
            },
            pick: {
              [teamName]: Array(5).fill(""),
              [oppositeTeam]: Array(5).fill(""),
            },
            startedAt: null,
          },
          currentSet: nextSet,
          isNextSetPreparing: false,
        });
      });
    } catch (err) {
      console.error("createNextSet 트랜잭션 실패:", err);
    }
  };

  return {
    goToNextStep,
    setStartedAtIfNeeded,
    commitAndAdvance,
    commitTotalPickIfNeeded,
    toggleIsNextSetPreparing,
    createNextSet,
  };
};
