# PIP.EXE

A small horror platformer in the "cursed game file" genre, playable in the browser. It is plain HTML, canvas and Web Audio. There are no image or sound files: every sprite, tile, face and note is generated in code. The characters, story and levels are all original.

## The story

In 1995 a tiny studio called Bramblebyte Software was making a mascot platformer about **Pip the Possum**. The publisher cancelled it before release. One prototype disc survived, labelled `PIP_PROTO_07.EXE`.

Pip learned one trick from the developers: when he gets hit, he *plays dead*. Then he started making everyone else play it too.

You play the save files in order:

| File | Friend | Stage | What's different |
| --- | --- | --- | --- |
| 1 | Hazel the flying squirrel | Clover Hills | Hold jump to glide. The world rots the further right you go. |
| 2 | Digby the mole | Lantern Mine | Pitch dark, you only see what your helmet lamp hits. Something walks the tunnels. |
| 3 | DEBUG, the developer | Test Room | Unfinished dev level full of notes, recovery disks and a terminal that should not be used. |
| 4 | Player 2 | ??? | Your turn. |

There are two endings. The game remembers you between visits.

## Controls

| Action | Keyboard | Gamepad |
| --- | --- | --- |
| Move | Arrows / WASD | D-pad / left stick |
| Jump (hold to glide as Hazel) | Z / Space / K | A |
| Read signs, use things | X / J / E | X / B |
| **Play dead** (hold) | Down / S | D-pad down |
| Start / confirm | Enter | Start |
| Pause | Esc / P | Select |
| Mute | M | |
| Flashing effects on/off | F | |

On phones and tablets, on-screen buttons appear under the game.

On the file select, hold X to erase all saved progress.

## Running it

Open `index.html` in a browser. No build step and no server needed. Headphones help.

**Content warning:** jumpscares, loud screams, flashing lights and horror themes. You can reduce flashing from the first screen (F).

## Code layout

| File | What it holds |
| --- | --- |
| `js/engine.js` | Canvas scaling, input (keys, touch, gamepad), pixel painter, 5x7 bitmap font, screen effects, cutscene coroutines |
| `js/audio.js` | Web Audio chip synth, step sequencer, songs, sound effects |
| `js/sprites.js` | Character and prop sprites, drawn pixel by pixel |
| `js/art.js` | Title art, scare faces, logos |
| `js/world.js` | Tiles, parallax backgrounds, physics, player controller, dithered darkness |
| `js/entities.js` | Map builder, decor art, Pip |
| `js/stages.js` | The four levels and their scripted events |
| `js/play.js` | Dialog, save progress, the in-level scene |
| `js/scenes.js` | Warning, boot, title, file select, death and ending scenes |
| `js/main.js` | Boot and fixed-step game loop |
