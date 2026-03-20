"use server";

import { supabase } from "@/src/lib/supabase";

export async function submitClueAction(playerId: string, roomCode: string, clue: string) {
  try {
    // 1. Update the player's clue
    const { error: updateError } = await supabase
      .from("players")
      .update({ current_clue: clue })
      .eq("id", playerId);

    if (updateError) {
      console.error("Error updating clue:", updateError);
      return { success: false, error: "Failed to submit clue." };
    }

    // 2. Check if all players have submitted their clues
    const { data: players, error: playersError } = await supabase
      .from("players")
      .select("current_clue")
      .eq("room_code", roomCode);

    if (playersError || !players) {
      return { success: true }; // Still submitted successfully, but phase check failed
    }

    const allSubmitted = players.every(p => p.current_clue && p.current_clue.trim().length > 0);

    // 3. If everyone has submitted, move the room to the voting phase
    if (allSubmitted) {
      await supabase
        .from("rooms")
        .update({ game_status: "voting" })
        .eq("room_code", roomCode);
    }

    return { success: true };
  } catch (error) {
    console.error("Action error:", error);
    return { success: false, error: "A server brain-fart occurred." };
  }
}

export async function toggleRerollVoteAction(playerId: string, roomCode: string, wantsReroll: boolean) {
  try {
    // 1. Update the player's specific vote
    const { error: updateError } = await supabase
      .from("players")
      .update({ wants_reroll: wantsReroll })
      .eq("id", playerId);

    if (updateError) {
        console.error("Error updating reroll vote:", updateError);
        return { success: false, error: "Failed to log vote." };
    }

    // 2. Fetch all players to check for a majority
    const { data: players, error: playersError } = await supabase
      .from("players")
      .select("id, wants_reroll")
      .eq("room_code", roomCode);
      
    if (playersError || !players) return { success: false, error: "Failed to fetch players." };

    const rerollCount = players.filter(p => p.wants_reroll).length;
    
    // Calculate majority (Ties do not trigger a reroll)
    const majority = Math.floor(players.length / 2) + 1;

    if (rerollCount >= majority) {
       // 3. Majority Reached: Trigger the Reroll!
       const { data: prompts } = await supabase.from("prompts").select("id");
       
       if (prompts && prompts.length > 0) {
          // Pick a completely random prompt
          const randomPrompt = prompts[Math.floor(Math.random() * prompts.length)];
          
          // Update the room with the new prompt
          await supabase
            .from("rooms")
            .update({ current_prompt_id: randomPrompt.id })
            .eq("room_code", roomCode);
          
          // Reset ALL votes and wipe any clues players had started writing
          await supabase
            .from("players")
            .update({ wants_reroll: false, current_clue: null })
            .eq("room_code", roomCode);
       }
    }

    return { success: true };
  } catch (error) {
      console.error("Action error:", error);
      return { success: false, error: "An unexpected error occurred." };
  }
}