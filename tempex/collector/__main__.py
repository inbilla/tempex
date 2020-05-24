import argparse
from tempex.collector.environment import Environment
import sys
import subprocess
import time


def parse_args(args=None):
    parser = argparse.ArgumentParser()

    parser.add_argument('--once', default=False, action='store_true')
    parser.add_argument('--process', default=False, action='store_true')
    parser.add_argument('--period', default=15*60)

    args = parser.parse_args(args)
    return args


def main(args=None):
    args = parse_args(args)

    period = args.period
    config = "config.ini"
    environment = Environment(config)
    if args.once:
        environment.run_once()
    else:
        while True:
            if args.process:
                sub_args = [sys.executable, '-m'] + sys.argv[0].split(' ') + sys.argv[2:] + ['--once']
                subprocess.check_call(sub_args)
            else:
                environment.run_once()
            print("Sleeping for {} seconds...".format(period))
            time.sleep(period)


if __name__ == "__main__":
    main()
