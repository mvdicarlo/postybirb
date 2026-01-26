#! /usr/bin/bash
set -o pipefail
xvfb-run --auto-servernum --server-args="-screen 0 1280x960x24" ./PostyBirb --headless --no-sandbox --port=8080 |& grep -v -E "ERROR:viz_main_impl\.cc\(183\)|ERROR:object_proxy\.cc\(576\)|ERROR:bus\.cc\(408\)"