"use server";

import { supabase } from "@/src/lib/supabase";

/**
 * RACE CONDITION FIXES:
 * (Assuming you have already run the SQL scripts for check_and_advance_writing 
 * and check_and_trigger_reroll in your Supabase SQL Editor!)
 */

export async function submitClueAction(playerId: string, roomCode: string, clue: string) {
  try {
    // 1. Attempt the transaction-safe RPC first
    const { error: rpcError } = await supabase.rpc("check_and_advance_writing", {
      p_room_code: roomCode,
      p_player_id: playerId,
      p_clue: clue,
    });

    // 2. FALLBACK: Gracefully use original code if RPC fails or isn't created yet
    if (rpcError) {
      console.warn("RPC 'check_and_advance_writing' failed or not found. Falling back to manual check.");
      
      const { error: updateError } = await supabase
        .from("players")
        .update({ current_clue: clue })
        .eq("id", playerId);

      if (updateError) {
        console.error("Error updating clue:", updateError);
        return { success: false, error: "Failed to submit clue." };
      }

      const { data: players, error: playersError } = await supabase
        .from("players")
        .select("current_clue")
        .eq("room_code", roomCode);

      if (playersError || !players) {
        return { success: true };
      }

      const allSubmitted = players.every(p => p.current_clue && p.current_clue.trim().length > 0);

      if (allSubmitted) {
        await supabase
          .from("rooms")
          .update({ game_status: "voting" })
          .eq("room_code", roomCode);
      }
    }

    return { success: true };
  } catch (error) {
    console.error("Action error:", error);
    return { success: false, error: "A server brain-fart occurred." };
  }
}

export async function toggleRerollVoteAction(playerId: string, roomCode: string, wantsReroll: boolean) {
  try {
    // 1. Attempt the transaction-safe RPC first
    const { data: rerollTriggered, error: rpcError } = await supabase.rpc("check_and_trigger_reroll", {
      p_room_code: roomCode,
      p_player_id: playerId,
      p_wants_reroll: wantsReroll,
    });

    // 2. FALLBACK: Gracefully use original code if RPC fails or isn't created yet
    if (rpcError) {
      console.warn("RPC 'check_and_trigger_reroll' failed or not found. Falling back to manual check.");
      
      const { error: updateError } = await supabase
        .from("players")
        .update({ wants_reroll: wantsReroll })
        .eq("id", playerId);

      if (updateError) {
          console.error("Error updating reroll vote:", updateError);
          return { success: false, error: "Failed to log vote." };
      }

      const { data: players, error: playersError } = await supabase
        .from("players")
        .select("id, wants_reroll")
        .eq("room_code", roomCode);
        
      if (playersError || !players) return { success: false, error: "Failed to fetch players." };

      const rerollCount = players.filter(p => p.wants_reroll).length;
      const majority = Math.floor(players.length / 2) + 1;

      if (rerollCount >= majority) {
         const { data: prompts } = await supabase.from("prompts").select("id");
         
         if (prompts && prompts.length > 0) {
            const randomPrompt = prompts[Math.floor(Math.random() * prompts.length)];
            
            await supabase
              .from("rooms")
              .update({ current_prompt_id: randomPrompt.id })
              .eq("room_code", roomCode);
            
            await supabase
              .from("players")
              .update({ wants_reroll: false, current_clue: null })
              .eq("room_code", roomCode);
         }
      }
    }

    return { success: true };
  } catch (error) {
      console.error("Action error:", error);
      return { success: false, error: "An unexpected error occurred." };
  }
}

// 3. NEW ACTION: Used by the GlobalTimer to push AFK players forward
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