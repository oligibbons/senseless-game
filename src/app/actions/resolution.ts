// src/app/actions/resolution.ts
"use server";

import { supabase } from "@/src/lib/supabase";
import { PlayerStats } from "@/src/types/database";

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
      
      // Initialize with defaults, supporting the new stats
      let newStats: PlayerStats = p.stats || {
        correct_guesses: 0,
        fooled_others: 0,
        longest_clue: 0,
        shortest_clue: 999,
        wrong_guesses: 0,
        innocent_votes_received: 0,
        successful_steals: 0,
        times_caught: 0,
      };

      // Safety fallback for existing records in the DB that lack the new fields
      newStats.wrong_guesses = newStats.wrong_guesses || 0;
      newStats.innocent_votes_received = newStats.innocent_votes_received || 0;
      newStats.successful_steals = newStats.successful_steals || 0;
      newStats.times_caught = newStats.times_caught || 0;

      // 1. Calculate Scores and Funny Stats
      if (p.id === imposterId) {
        if (!imposterCaught) {
          roundScore += 2;
        } else {
          newStats.times_caught += 1; // Log imposter getting caught
        }

        if (imposterCaught && imposterStole) {
          roundScore += 2;
          newStats.successful_steals += 1; // Log a clutch steal
        }
        
        // Imposter fooled anyone who didn't vote for them
        const totalOtherPlayers = players.length - 1;
        const votesForImposter = voteCounts[p.id] || 0;
        newStats.fooled_others += (totalOtherPlayers - votesForImposter);
      } else {
        if (p.voted_for === imposterId) {
          if (!imposterStole) roundScore += 1;
          newStats.correct_guesses += 1; // Log correct deduction
        } else if (p.voted_for) {
          newStats.wrong_guesses += 1; // Log voting for an innocent person
        }
        
        if (voteCounts[p.id] > 0) {
          roundScore -= 1;
          newStats.fooled_others += voteCounts[p.id]; 
          newStats.innocent_votes_received += voteCounts[p.id]; // Log looking suspicious while innocent
        }
      }

      // 2. Track Clue Lengths
      if (p.current_clue) {
        const len = p.current_clue.length;
        if (len > newStats.longest_clue) newStats.longest_clue = len;
        if (len < newStats.shortest_clue) newStats.shortest_clue = len;
      }

      return supabase
        .from("players")
        .update({ 
          score: p.score + roundScore,
          last_score_delta: roundScore,
          stats: newStats
        })
        .eq("id", p.id);
    });

    await Promise.all(playerUpdates);

    // 3. Check Win Condition
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

    // 4. Route to the correct state
    if (isFinished) {
      await supabase
        .from("rooms")
        .update({ 
          game_status: "game_over",
          current_prompt_id: null 
        })
        .eq("room_code", roomCode);
    } else {
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