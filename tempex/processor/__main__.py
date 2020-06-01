import argparse
from tempex.collector.environment import Environment
import sys
import subprocess
import time
from ..common import config
from .processor import Processor


def parse_args(args=None):
    parser = argparse.ArgumentParser()

    parser.add_argument('--once', default=False, action='store_true')
    parser.add_argument('--period', default=5*60)

    args = parser.parse_args(args)
    return args


def main(args=None):
    args = parse_args(args)

    period = args.period
    config_file = config.get_config_file()
    environment = Environment(config_file)
    processor = Processor(environment)
    if args.once:
        processor.run_once()
    else:
        while True:
            processor.run_once()
            print("Sleeping for {} seconds...".format(period))
            time.sleep(period)


if __name__ == "__main__":
    main()
