// src/app/actions/lobby.ts
"use server";

import { supabase } from "@/src/lib/supabase";

export async function closeRoomAction(roomCode: string, hostId: string) {
  try {
    const { data: room } = await supabase.from("rooms").select("host_id").eq("room_code", roomCode).single();
    if (room?.host_id !== hostId) throw new Error("Only the host can close the room.");

    // Because we set ON DELETE CASCADE in SQL, deleting the room automatically deletes all players in it.
    await supabase.from("rooms").delete().eq("room_code", roomCode);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// FIXED: Added timerEnabled parameter
export async function updateSettingsAction(
  roomCode: string, 
  hostId: string, 
  mode: "rounds" | "score", 
  target: number, 
  timerEnabled: boolean = true
) {
  try {
    const { data: room } = await supabase.from("rooms").select("host_id").eq("room_code", roomCode).single();
    if (room?.host_id !== hostId) throw new Error("Only the host can change settings.");

    // FIXED: Pushing the timer_enabled state into the JSONB object
    await supabase.from("rooms").update({ 
      round_settings: { mode, target, timer_enabled: timerEnabled } 
    }).eq("room_code", roomCode);
    
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function playAgainAction(roomCode: string, hostId: string) {
  try {
    const { data: room } = await supabase.from("rooms").select("host_id").eq("room_code", roomCode).single();
    if (room?.host_id !== hostId) throw new Error("Only the host can restart the game.");

    // 1. Reset Room Rounds and Status
    await supabase.from("rooms").update({ 
      current_round: 0,
      game_status: "lobby",
      current_prompt_id: null
    }).eq("room_code", roomCode);

    // 2. Deep Reset Player Scores and Stats
    const { data: players } = await supabase.from("players").select("id").eq("room_code", roomCode);
    if (players) {
      const updates = players.map(p => 
        supabase.from("players").update({ 
          score: 0,
          stats: null,
          current_clue: null,
          voted_for: null,
          assigned_sense: null,
          is_imposter: false,
          last_score_delta: null // Reset the delta tracker
        }).eq("id", p.id)
      );
      await Promise.all(updates);
    }
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}