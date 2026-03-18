"use server";

import { supabase } from "@/src/lib/supabase";
import { Sense } from "@/src/types/database";

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export async function startGameAction(roomCode: string, hostId: string) {
  try {
    const { data: room, error: roomError } = await supabase
      .from("rooms")
      .select("host_id, current_round, round_settings")
      .eq("room_code", roomCode)
      .single();

    if (roomError || !room) throw new Error("Room not found.");
    if (room.host_id !== hostId) throw new Error("Only the host can start the game.");

    // Win Condition Check: Prevent starting if target reached
    const settings = room.round_settings;
    if (settings.mode === 'rounds' && room.current_round >= settings.target) {
      throw new Error("Game Over! Reset the game to play again.");
    }

    if (settings.mode === 'score') {
      const { data: topPlayer } = await supabase
        .from("players")
        .select("score")
        .eq("room_code", roomCode)
        .order("score", { ascending: false })
        .limit(1)
        .single();

      if (topPlayer && topPlayer.score >= settings.target) {
        throw new Error("A player has already won! Reset the game to play again.");
      }
    }

    const { data: prompts, error: promptError } = await supabase
      .from("prompts")
      .select("id");

    if (promptError || !prompts || prompts.length === 0) {
      throw new Error("No prompts available.");
    }
    const randomPrompt = prompts[Math.floor(Math.random() * prompts.length)];

    const { data: players, error: playersError } = await supabase
      .from("players")
      .select("id")
      .eq("room_code", roomCode);

    if (playersError || !players || players.length < 3) {
      throw new Error("Not enough players.");
    }

    const shuffledPlayers = shuffleArray(players);
    const senses: Sense[] = ["Sight", "Sound", "Smell", "Touch", "Taste"];
    const shuffledSenses = shuffleArray(senses);

    const playerUpdates = shuffledPlayers.map((player, index) => {
      return supabase
        .from("players")
        .update({
          is_imposter: index === 0,
          assigned_sense: shuffledSenses[index % senses.length],
          current_clue: null,
          voted_for: null
        })
        .eq("id", player.id);
    });

    await Promise.all(playerUpdates);

    const { error: updateRoomError } = await supabase
      .from("rooms")
      .update({
        game_status: "writing",
        current_prompt_id: randomPrompt.id,
        current_round: room.current_round + 1,
      })
      .eq("room_code", roomCode);

    if (updateRoomError) throw updateRoomError;

    return { success: true };
  } catch (error: any) {
    console.error("Game Start Error:", error);
    return { success: false, error: error.message };
  }
}