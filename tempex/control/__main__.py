import subprocess
import os
import sys


def main(args=None):
    args = args or sys.argv

    env = dict(os.environ)
    env['COMPOSE_PROJECT_NAME '] = 'tempex'
    subprocess.call(['docker-compose'] + args[1:])


if __name__ == "__main__":
    main()
