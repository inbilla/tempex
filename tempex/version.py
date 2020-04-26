import os

SCRIPT_DIR = os.path.dirname(__file__)
with open(os.path.join(SCRIPT_DIR, 'VERSION')) as f:
    VERSION = f.read().strip()