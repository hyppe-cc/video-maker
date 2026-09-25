import type { Alignment } from "./cues.ts";
import type { Voice } from "./project.ts";

const API = "https://api.elevenlabs.io";

function key(): string {
	const k = process.env.ELEVENLABS_API_KEY;
	if (!k) throw new Error("ELEVENLABS_API_KEY is not set (copy .env.example to .env and fill it in)");
	return k;
}

async function call(path: string, init: RequestInit = {}) {
	const res = await fetch(API + path, {
		...init,
		headers: { "xi-api-key": key(), "content-type": "application/json", ...init.headers },
	});
	if (!res.ok) throw new Error(`ElevenLabs ${res.status}: ${(await res.text()).slice(0, 500)}`);
	return res.json();
}

export type Speech = { audio: Buffer; alignment: Alignment };

/** TTS with per-character timestamps (one request for the whole script keeps prosody natural). */
export async function speak(text: string, voice: Voice): Promise<Speech> {
	if (!voice.voiceId) throw new Error('project.json voice.voiceId is empty (run "bun vk voices" to pick one)');
	const body: Record<string, unknown> = { text, model_id: voice.model };
	if (voice.settings) body.voice_settings = voice.settings;
	if (voice.languageCode) body.language_code = voice.languageCode;
	const r = await call(`/v1/text-to-speech/${voice.voiceId}/with-timestamps?output_format=mp3_44100_128`, {
		method: "POST",
		body: JSON.stringify(body),
	});
	return { audio: Buffer.from(r.audio_base64, "base64"), alignment: r.alignment };
}

export type VoiceListing = { voice_id: string; name: string; category?: string; labels?: Record<string, string> };

export async function listVoices(search?: string): Promise<VoiceListing[]> {
	const q = new URLSearchParams({ page_size: "100" });
	if (search) q.set("search", search);
	const r = await call(`/v2/voices?${q}`);
	return r.voices;
}
