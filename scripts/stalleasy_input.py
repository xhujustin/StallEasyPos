"""Switch Fcitx5 and Onboard's in-memory layer without blocking GTK."""

import gc
import logging
import subprocess
import threading
import weakref

from gi.repository import GLib
from Onboard.Keyboard import Keyboard

log = logging.getLogger("StallEasyPos.input")


def switch(layer_index: int, input_method: str) -> None:
    keyboards = [obj for obj in gc.get_objects() if isinstance(obj, Keyboard)]
    if len(keyboards) != 1:
        log.error("Expected one Onboard keyboard, found %d", len(keyboards))
        return
    keyboard_ref = weakref.ref(keyboards[0])

    def apply_layer() -> bool:
        keyboard = keyboard_ref()
        if keyboard is not None:
            keyboard.active_layer_index = layer_index
            keyboard.invalidate_visible_layers()
            keyboard.invalidate_canvas()
            keyboard.commit_ui_updates()
        return False

    def change_input_method() -> None:
        try:
            subprocess.run(
                ["fcitx5-remote", "-s", input_method],
                check=True,
                capture_output=True,
                timeout=5,
            )
        except (OSError, subprocess.CalledProcessError, subprocess.TimeoutExpired) as exc:
            log.error("Could not switch Fcitx5 to %s: %s", input_method, exc)
            return
        GLib.idle_add(apply_layer)

    threading.Thread(target=change_input_method, daemon=True).start()
