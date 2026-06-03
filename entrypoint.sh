#! /usr/bin/bash
set -o pipefail
xvfb-run --auto-servernum --server-args="-screen 0 1280x960x24" ./PostyBirb --headless --no-sandbox |& grep -v -E "ERROR:viz_main_impl|ERROR:dbus/object_proxy|ERROR:dbus/bus|ERROR:content/browser/browser_main_loop|ERROR:gles2_cmd_decoder_passthrough|ERROR:gl_utils"