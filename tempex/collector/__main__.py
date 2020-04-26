import argparse
from tempex.collector.environment import Environment


def parse_args(args=None):
    parser = argparse.ArgumentParser()

    parser.add_argument('--once', default=False, action='store_true')

    args = parser.parse_args(args)
    return args


def main(args=None):
    args = parse_args(args)

    config = "config.ini"
    environment = Environment(config)
    if args.once:
        environment.run_once()
    else:
        environment.run()


if __name__ == "__main__":
    main()