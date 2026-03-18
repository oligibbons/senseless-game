"use server";

import { supabase } from "@/src/lib/supabase";

export async function finalizeRoundAction(
  roomCode: string,
  imposterId: string,
  imposterCaught: boolean,
  imposterStole: boolean
) {
  try {
    const { data: players, error: playersError } = await supabase
      .from("players")
      .select("*")
      .eq("room_code", roomCode);

    if (playersError || !players) throw new Error("Could not fetch players.");

    const voteCounts: Record<string, number> = {};
    players.forEach((p) => {
      if (p.voted_for) {
        voteCounts[p.voted_for] = (voteCounts[p.voted_for] || 0) + 1;
      }
    });

    const playerUpdates = players.map((p) => {
      let roundScore = 0;
      if (p.id === imposterId) {
        if (!imposterCaught) roundScore += 2;
        if (imposterCaught && imposterStole) roundScore += 2;
      } else {
        if (p.voted_for === imposterId && !imposterStole) roundScore += 1;
        if (voteCounts[p.id] > 0) roundScore -= 1;
      }

      return supabase
        .from("players")
        .update({ score: p.score + roundScore })
        .eq("id", p.id);
    });

    await Promise.all(playerUpdates);

    // Check Win Condition
    const { data: room } = await supabase
      .from("rooms")
      .select("round_settings, current_round")
      .eq("room_code", roomCode)
      .single();

    const { data: leader } = await supabase
      .from("players")
      .select("score")
      .eq("room_code", roomCode)
      .order("score", { ascending: false })
      .limit(1)
      .single();

    if (!room) throw new Error("Room missing.");

    const isFinished = room.round_settings.mode === 'rounds'
      ? room.current_round >= room.round_settings.target
      : (leader?.score || 0) >= room.round_settings.target;

    // Only return to lobby if the game is NOT finished
    if (!isFinished) {
      await supabase
        .from("rooms")
        .update({ 
          game_status: "lobby",
          current_prompt_id: null 
        })
        .eq("room_code", roomCode);
    }

    return { success: true };
  } catch (error: any) {
    console.error("Finalize Round Error:", error);
    return { success: false, error: error.message };
  }
}