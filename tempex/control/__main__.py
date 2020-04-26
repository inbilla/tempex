import subprocess
import os
import sys


SCRIPT_DIR = os.path.dirname(__file__)
PKG_DIR = os.path.join(SCRIPT_DIR, '..')
DOCKER_DIR = os.path.join(SCRIPT_DIR, '..', 'docker')


def main(args=None):
    args = args or sys.argv[1:]

    env = dict(os.environ)
    env['COMPOSE_PROJECT_NAME'] = 'tempex'
    env['TEMPEX_PACKAGE_ROOT'] = PKG_DIR
    subprocess.call(['docker-compose'] + args, cwd=DOCKER_DIR, env=env)


if __name__ == "__main__":
    main()
