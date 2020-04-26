import subprocess
import os
import sys


SCRIPT_DIR = os.path.dirname(__file__)
DOCKER_DIR = os.path.join(SCRIPT_DIR, '..', 'docker')


def main(args=None):
    args = args or sys.argv

    env = dict(os.environ)
    env['COMPOSE_PROJECT_NAME '] = 'tempex'
    subprocess.call(['docker-compose'] + args[1:], cwd=DOCKER_DIR, env=env)


if __name__ == "__main__":
    main()
