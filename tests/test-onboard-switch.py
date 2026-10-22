"""Regression: layer switches must commit redraws without waiting for a gesture."""

import importlib.util
import subprocess
import sys
import types
from pathlib import Path
from unittest.mock import patch


class Keyboard:
    def __init__(self):
        self.active_layer_index = 0
        self.calls = []

    def invalidate_visible_layers(self):
        self.calls.append("layers")

    def invalidate_canvas(self):
        self.calls.append("canvas")

    def commit_ui_updates(self):
        self.calls.append("commit")


glib = types.SimpleNamespace(idle_add=lambda callback: callback())
gi = types.ModuleType("gi")
repository = types.ModuleType("gi.repository")
repository.GLib = glib
gi.repository = repository
onboard = types.ModuleType("Onboard")
keyboard_module = types.ModuleType("Onboard.Keyboard")
keyboard_module.Keyboard = Keyboard
sys.modules.update({"gi": gi, "gi.repository": repository,
                    "Onboard": onboard, "Onboard.Keyboard": keyboard_module})

path = Path(__file__).resolve().parents[1] / "scripts/stalleasy_input.py"
spec = importlib.util.spec_from_file_location("stalleasy_input_test", path)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

keyboard = Keyboard()


class ImmediateThread:
    def __init__(self, target, daemon):
        self.target = target

    def start(self):
        self.target()


with patch.object(module.gc, "get_objects", return_value=[keyboard]), \
     patch.object(module.threading, "Thread", ImmediateThread), \
     patch.object(module.subprocess, "run", return_value=subprocess.CompletedProcess([], 0)):
    module.switch(3, "keyboard-us")

assert keyboard.active_layer_index == 3
assert keyboard.calls == ["layers", "canvas", "commit"]
print("PASS: 中英文切換會立即提交 Onboard 畫面更新。")
