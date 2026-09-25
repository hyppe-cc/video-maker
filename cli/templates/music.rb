# Music for this video, written in Sonic Pi (https://sonic-pi.net/code.html).
# `bun vk music` / `bun vk mix` / `bun vk render` play it in the Sonic Pi web app and record it.
# t=0 is the first frame of the video. Injected before this file (all in seconds):
#   DUR     video length
#   LINES   [[start, end], ...] one per voice line
#   MARKS   {name: t} from the {#name} markers in script.md
#   EVENTS  {impact: [...], cut: [...], pop: [...], ...} the SFX events of scenes.js SPEC
#   sec(s)  seconds -> beats at the current BPM (sleep and envelope times are in beats)
# The voice sits on top: keep the mids calm while people talk, put energy in kick, bass and hats.

use_bpm {{bpm}}
use_random_seed 7

drop = (EVENTS[:impact] || [DUR / 4])[0]  # first impact = the drop
grid = sec(drop) % 1                        # anchor the beat grid on the drop

# intro: hats and a soft pad until the drop
in_thread do
  sleep grid
  live_loop :hats do
    sample :drum_cymbal_closed, amp: 0.7, rate: 1.1, pan: rrand(-0.3, 0.3)
    sleep 0.5
  end
end

in_thread do
  with_fx :lpf, cutoff: 80 do
    synth :hollow, note: chord(:e3, :minor7), attack: 1, release: sec(drop), amp: 1.2
  end
end

# riser into the drop
in_thread do
  sleep sec(drop - 1.5)
  synth :noise, attack: sec(1.4), release: sec(0.1), cutoff: 100, amp: 0.2
end

# the drop: kick + bass on the beat grid
in_thread do
  sleep sec(drop)
  sample :bd_boom, amp: 1.6
  live_loop :kick do
    sample :bd_haus, amp: 1.4
    sleep 1
  end
  live_loop :bass do
    use_synth :tb303
    play (ring :e1, :e1, :g1, :a1).tick, release: 0.18, cutoff: rrand(70, 95), res: 0.3, amp: 0.5
    sleep 0.5
  end
end
