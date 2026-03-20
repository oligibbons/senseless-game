"use server";

import { supabase } from "@/src/lib/supabase";

export async function submitVoteAction(playerId: string, roomCode: string, votedForId: string) {
  try {
    // 1. Attempt to record the vote and advance the phase atomically via RPC.
    const { error: rpcError } = await supabase.rpc("check_and_advance_voting", {
      p_room_code: roomCode,
      p_player_id: playerId,
      p_voted_for_id: votedForId,
    });

    // 2. FALLBACK: If the RPC hasn't been created in Supabase yet, gracefully fall back.
    if (rpcError) {
      console.warn("RPC 'check_and_advance_voting' not found or failed. Falling back to manual check.");
      
      const { error: updateError } = await supabase
        .from("players")
        .update({ voted_for: votedForId })
        .eq("id", playerId);

      if (updateError) throw updateError;

      const { data: players, error: playersError } = await supabase
        .from("players")
        .select("voted_for")
        .eq("room_code", roomCode);

      if (playersError || !players) throw new Error("Could not fetch player statuses.");

      const allVoted = players.every((p) => p.voted_for !== null);

      if (allVoted) {
        const { error: roomError } = await supabase
          .from("rooms")
          .update({ game_status: "resolution" })
          .eq("room_code", roomCode);

        if (roomError) throw roomError;
      }
    }

    return { success: true };
  } catch (error: any) {
    console.error("Submit Vote Error:", error);
    return { success: false, error: error.message };
  }
}

// NEW ACTION: Used by the GlobalTimer to push AFK players forward into resolution
export async function forceAdvancePhaseAction(roomCode: string, nextPhase: string) {
  try {
    const { error } = await supabase
      .from("rooms")
      .update({ game_status: nextPhase })
      .eq("room_code", roomCode);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error("Force advance error:", error);
    return { success: false, error: "Failed to force advance the phase." };
  }
}