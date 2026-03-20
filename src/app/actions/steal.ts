// src/app/actions/steal.ts
"use server";

import { supabase } from "@/src/lib/supabase";

export async function triggerStealVotePhaseAction(roomCode: string, guess: string) {
    try {
        // Reset player votes just in case
        await supabase.from("players").update({ steal_vote: null }).eq("room_code", roomCode);
        
        // Push the room into the voting phase and broadcast the guess
        const { error } = await supabase.from("rooms")
            .update({ game_status: "steal_voting", steal_guess: guess })
            .eq("room_code", roomCode);
            
        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error("Failed to trigger steal vote:", error);
        return { success: false };
    }
}

export async function castStealVoteAction(playerId: string, isYes: boolean) {
    try {
        const { error } = await supabase.from("players")
            .update({ steal_vote: isYes })
            .eq("id", playerId);
            
        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error("Failed to cast steal vote:", error);
        return { success: false };
    }
}