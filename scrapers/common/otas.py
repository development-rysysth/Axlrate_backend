"""
OTA whitelist constants
Reads from shared/otas.json to ensure consistency across TypeScript and Python code
"""
import json
from pathlib import Path

# Get the path to shared/otas.json relative to this file
# This file is at: scrapers/common/otas.py
# Target is at: shared/otas.json
_current_dir = Path(__file__).parent
_project_root = _current_dir.parent.parent
_otas_json_path = _project_root / 'shared' / 'otas.json'

# Read the JSON file
with open(_otas_json_path, 'r') as f:
    _otas_config = json.load(f)

WHITELIST_OTAS = _otas_config['WHITELIST_OTAS']

